import axios from 'axios';
import { config } from '../config';
import { addDays, parseISO } from 'date-fns';
import { format as formatZoned } from 'date-fns-tz';
import { fr } from 'date-fns/locale';

const CAL_API_URL = 'https://api.cal.com/v1';

export class CalComService {
    private apiKey: string;
    private eventTypeId: number;

    constructor() {
        this.apiKey = config.calcom.apiKey || '';
        this.eventTypeId = parseInt(config.calcom.eventTypeId || '0');
    }

    /**
     * Check availability for the event type.
     * Scans up to 7 days if no slots are found in the requested range.
     * Converts returned slots to 'Europe/Paris' for clear specific display.
     */
    async getAvailability(startTime: string, endTime: string) {
        let currentStart = startTime;
        let currentEnd = endTime;
        let attempts = 0;
        const maxAttempts = 7; // Scan up to 7 days forward
        const startTime_perf = Date.now();

        while (attempts < maxAttempts) {
            try {
                console.log(`[PERF] Checking availability from ${currentStart} to ${currentEnd} (Attempt ${attempts + 1})`);
                const response = await axios.get(`${CAL_API_URL}/slots`, {
                    params: {
                        apiKey: this.apiKey,
                        eventTypeId: this.eventTypeId,
                        startTime: currentStart,
                        endTime: currentEnd,
                    },
                });

                const slots = response.data.slots || {};
                const daysWithSlots = Object.keys(slots);

                if (daysWithSlots.length > 0) {
                    const formattedSlots: any = {};
                    for (const day of daysWithSlots) {
                        const dayDate = parseISO(day);
                        const formattedDayKey = formatZoned(dayDate, 'EEEE d MMMM yyyy', { locale: fr, timeZone: 'Europe/Paris' });

                        formattedSlots[formattedDayKey] = slots[day].map((slot: any) => {
                            const slotDate = new Date(slot.time);
                            const displayTime = formatZoned(slotDate, 'HH:mm', { timeZone: 'Europe/Paris' });
                            const bookingTime = formatZoned(slotDate, "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: 'Europe/Paris' });

                            return {
                                time: bookingTime,
                                displayTime: displayTime
                            };
                        });
                    }
                    const duration = Date.now() - startTime_perf;
                    console.log(`[PERF] getAvailability completed in ${duration}ms (found slots on attempt ${attempts + 1})`);

                    let message = "Found slots (Times shown are in Europe/Paris timezone). Day names are in French.";
                    if (attempts > 0) {
                        const originalStart = formatZoned(parseISO(startTime), 'd MMMM', { locale: fr, timeZone: 'Europe/Paris' });
                        // calculate the new start date
                        const newStart = formatZoned(parseISO(currentStart), 'd MMMM', { locale: fr, timeZone: 'Europe/Paris' });
                        message = `⚠️ ACTION REQUIRED: No slots were found for the originally requested date (${originalStart}). I automatically searched forward and found these slots starting from ${newStart}. DU DOIS préciser à l'utilisateur que ce n'est pas la date demandée initialement.`;
                    }

                    return { slots: formattedSlots, message: message };
                }

                // If no slots, increment day
                const nextStart = addDays(parseISO(currentStart), 1);
                const nextEnd = addDays(parseISO(currentEnd), 1);
                currentStart = nextStart.toISOString();
                currentEnd = nextEnd.toISOString();
                attempts++;

            } catch (error: any) {
                console.error('Error fetching availability:', error.response?.data || error.message);
                throw new Error('Failed to fetch availability.');
            }
        }

        const duration = Date.now() - startTime_perf;
        console.log(`[PERF] getAvailability completed in ${duration}ms (no slots found after ${maxAttempts} attempts)`);
        return { message: "No availability found for the next 7 days." };
    }

    /**
     * Create a booking.
     */
    async createBooking(
        startTime: string,
        name: string,
        email: string,
        description: string,
        phoneNumber: string
    ) {
        try {
            // Cal.com API v1 treats the 'start' field as UTC if it contains 'Z'.
            // Since our getAvailability tool now returns the exact UTC time, 
            // we pass it directly to ensure the appointment is correctly booked.
            const payload = {
                eventTypeId: this.eventTypeId,
                start: startTime,
                responses: {
                    name,
                    email,
                    notes: description,
                    location: {
                        value: 'phone',
                        optionValue: phoneNumber.replace('whatsapp:', '')
                    }
                },
                metadata: {
                    waId: phoneNumber
                },
                timeZone: 'Europe/Paris', // Set the context to Paris for display in Cal.com UI
                language: 'fr',
            };

            console.log("Creating Booking with payload (START TIME SHOULD BE UTC):", JSON.stringify(payload, null, 2));

            const response = await axios.post(`${CAL_API_URL}/bookings`, payload, {
                params: { apiKey: this.apiKey },
            });
            return response.data;
        } catch (error: any) {
            console.error('Error creating booking:', error.response?.data || error.message);
            throw new Error(`Failed to create booking. API Error: ${JSON.stringify(error.response?.data || error.message)}`);
        }
    }

    /**
     * Get bookings associated with a WhatsApp ID (using metadata filtering if possible, or email).
     * Only returns ACTIVE bookings (not cancelled or rejected).
     * Times are converted to Europe/Paris for display.
     */
    async getBookings(email?: string, waId?: string) {
        try {
            const response = await axios.get(`${CAL_API_URL}/bookings`, {
                params: {
                    apiKey: this.apiKey,
                    ...(email && { userEmail: email })
                }
            });

            // Filter bookings to only include active ones
            // Cal.com statuses: 'pending', 'accepted', 'cancelled', 'rejected'
            const allBookings = response.data.bookings || [];
            console.log(`[DEBUG] Cal.com getBookings: Found ${allBookings.length} total bookings.`);

            if (allBookings.length > 0) {
                // Log the first few bookings' metadata for debugging
                console.log(`[DEBUG] Sample booking metadata:`, JSON.stringify(allBookings.slice(0, 3).map((b: any) => ({
                    id: b.id,
                    status: b.status,
                    waId: b.metadata?.waId,
                    email: b.attendees?.[0]?.email
                }))));
            }

            // Filter: only active bookings (not cancelled or rejected)
            // Also filter by waId if provided (to get only this user's bookings)
            const activeBookings = allBookings.filter((booking: any) => {
                const isActive = booking.status !== 'CANCELLED' && booking.status !== 'cancelled' &&
                    booking.status !== 'REJECTED' && booking.status !== 'rejected';

                if (!isActive) return false;

                // Support both "whatsapp:+33..." and "33..." formats
                const normalizePhone = (p: string) => p.replace('whatsapp:', '').replace(/\s+/g, '');

                // If waId is provided, also filter by it
                if (waId && booking.metadata?.waId) {
                    return normalizePhone(booking.metadata.waId) === normalizePhone(waId);
                }

                return true;
            });

            console.log(`[DEBUG] getBookings: Found ${activeBookings.length} active bookings after filtering.`);

            // Return formatted list with times converted to Paris timezone
            const timeZone = 'Europe/Paris';
            return {
                bookings: activeBookings.map((b: any) => {
                    const startDate = new Date(b.startTime);
                    const endDate = new Date(b.endTime);

                    // Format times in Paris timezone with French locale
                    const displayStartTime = formatZoned(startDate, 'HH:mm', { timeZone });
                    const displayEndTime = formatZoned(endDate, 'HH:mm', { timeZone });
                    const displayDate = formatZoned(startDate, 'EEEE d MMMM yyyy', { locale: fr, timeZone });

                    return {
                        id: b.id,  // IMPORTANT: This is the numeric ID needed for cancelBooking
                        uid: b.uid,
                        title: b.title,
                        date: displayDate,  // e.g., "mercredi 7 janvier 2026"
                        startTime: displayStartTime,  // e.g., "12:00" (Paris time)
                        endTime: displayEndTime,  // e.g., "13:00" (Paris time)
                        rawStartTime: b.startTime, // ISO string for safety checks
                        status: b.status,
                        attendeeName: b.attendees?.[0]?.name,
                        attendeeEmail: b.attendees?.[0]?.email,
                        notes: b.description || b.attendees?.[0]?.notes

                    };
                })
            };
        } catch (error: any) {
            console.error('Error fetching bookings:', error.response?.data || error.message);
            return { bookings: [], error: 'Failed to fetch bookings' };
        }
    }

    async cancelBooking(bookingId: number, reason?: string) {
        console.log(`cancelBooking called with bookingId: ${bookingId} (type: ${typeof bookingId}), reason: ${reason}`);
        try {
            const response = await axios.delete(`${CAL_API_URL}/bookings/${bookingId}`, {
                params: {
                    apiKey: this.apiKey,
                    ...(reason && { reason })
                }
            });
            console.log('Cancellation successful:', response.data);
            return { success: true, message: 'Booking cancelled successfully', data: response.data };
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message;
            console.error('Error cancelling booking:', error.response?.data || error.message);

            // Handle specific error cases
            if (errorMessage.includes('already been cancelled') || errorMessage.includes('already cancelled')) {
                return { success: false, alreadyCancelled: true, message: 'This booking was already cancelled.' };
            }
            if (errorMessage.includes('not found')) {
                return { success: false, notFound: true, message: 'Booking not found.' };
            }

            return { success: false, error: errorMessage, message: `Failed to cancel booking (ID: ${bookingId}). API said: ${errorMessage}` };
        }
    }

    /**
     * Delete all active bookings for the configured event type.
     * Useful for cleaning up the demo environment.
     */
    async deleteAllBookings() {
        console.log('[CLEANUP] Starting automatic calendar cleanup...');
        try {
            // Fetch all bookings (without userEmail/waId filter to get everything)
            const response = await this.getBookings();
            const bookings = response.bookings || [];

            if (bookings.length === 0) {
                console.log('[CLEANUP] No active bookings found to delete.');
                return { success: true, count: 0 };
            }

            console.log(`[CLEANUP] Found ${bookings.length} active bookings to delete.`);

            let deletedCount = 0;
            for (const booking of bookings) {
                try {
                    console.log(`[CLEANUP] Deleting booking ${booking.id} (${booking.attendeeName})...`);
                    await this.cancelBooking(booking.id, "Automatic demo cleanup");
                    deletedCount++;
                } catch (err: any) {
                    console.error(`[CLEANUP] Failed to delete booking ${booking.id}:`, err.message);
                }
            }

            console.log(`[CLEANUP] Cleanup completed. Deleted ${deletedCount} bookings.`);
            return { success: true, count: deletedCount };
        } catch (error: any) {
            console.error('[CLEANUP] Error during automatic cleanup:', error.message);
            return { success: false, error: error.message };
        }
    }
}
