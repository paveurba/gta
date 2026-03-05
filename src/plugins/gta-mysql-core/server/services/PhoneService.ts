import * as alt from 'alt-server';
import mysql from 'mysql2/promise';

export interface PhoneContact {
    id?: number;
    player_id: number;
    contact_name: string;
    contact_number: string;
    created_at?: Date;
}

export interface PhoneMessage {
    id?: number;
    sender_id: number;
    receiver_id: number;
    message: string;
    is_read: boolean;
    sent_at?: Date;
}

export interface PhoneData {
    contacts: PhoneContact[];
    messages: PhoneMessage[];
    unreadCount: number;
}

export class PhoneService {
    constructor(private pool: mysql.Pool) {}

    // Contact Management
    async getContacts(playerId: number): Promise<PhoneContact[]> {
        const [rows] = await this.pool.execute(
            'SELECT * FROM phone_contacts WHERE player_id = ? ORDER BY contact_name',
            [playerId]
        );
        return rows as PhoneContact[];
    }

    async addContact(playerId: number, name: string, number: string): Promise<{ success: boolean; message: string; contact?: PhoneContact }> {
        // Check if contact already exists
        const [existing] = await this.pool.execute(
            'SELECT id FROM phone_contacts WHERE player_id = ? AND contact_number = ?',
            [playerId, number]
        );
        
        if ((existing as any[]).length > 0) {
            return { success: false, message: 'Contact already exists' };
        }

        const [result] = await this.pool.execute(
            'INSERT INTO phone_contacts (player_id, contact_name, contact_number) VALUES (?, ?, ?)',
            [playerId, name, number]
        );

        const contact: PhoneContact = {
            id: (result as any).insertId,
            player_id: playerId,
            contact_name: name,
            contact_number: number,
        };

        alt.log(`[PhoneService] Player ${playerId} added contact: ${name}`);
        return { success: true, message: 'Contact added', contact };
    }

    async deleteContact(playerId: number, contactId: number): Promise<{ success: boolean; message: string }> {
        const [result] = await this.pool.execute(
            'DELETE FROM phone_contacts WHERE id = ? AND player_id = ?',
            [contactId, playerId]
        );

        if ((result as any).affectedRows === 0) {
            return { success: false, message: 'Contact not found' };
        }

        return { success: true, message: 'Contact deleted' };
    }

    async updateContact(playerId: number, contactId: number, name: string, number: string): Promise<{ success: boolean; message: string }> {
        const [result] = await this.pool.execute(
            'UPDATE phone_contacts SET contact_name = ?, contact_number = ? WHERE id = ? AND player_id = ?',
            [name, number, contactId, playerId]
        );

        if ((result as any).affectedRows === 0) {
            return { success: false, message: 'Contact not found' };
        }

        return { success: true, message: 'Contact updated' };
    }

    // Message Management
    async getMessages(playerId: number): Promise<PhoneMessage[]> {
        const [rows] = await this.pool.execute(
            `SELECT * FROM phone_messages 
             WHERE sender_id = ? OR receiver_id = ? 
             ORDER BY sent_at DESC 
             LIMIT 100`,
            [playerId, playerId]
        );
        return rows as PhoneMessage[];
    }

    async getConversation(playerId: number, otherPlayerId: number): Promise<PhoneMessage[]> {
        const [rows] = await this.pool.execute(
            `SELECT * FROM phone_messages 
             WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
             ORDER BY sent_at ASC`,
            [playerId, otherPlayerId, otherPlayerId, playerId]
        );
        return rows as PhoneMessage[];
    }

    async sendMessage(senderId: number, receiverId: number, message: string): Promise<{ success: boolean; message: string; messageData?: PhoneMessage }> {
        if (!message || message.trim().length === 0) {
            return { success: false, message: 'Message cannot be empty' };
        }

        if (message.length > 500) {
            return { success: false, message: 'Message too long (max 500 characters)' };
        }

        const [result] = await this.pool.execute(
            'INSERT INTO phone_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
            [senderId, receiverId, message.trim()]
        );

        const messageData: PhoneMessage = {
            id: (result as any).insertId,
            sender_id: senderId,
            receiver_id: receiverId,
            message: message.trim(),
            is_read: false,
        };

        // Notify receiver if online
        const receiverPlayer = alt.Player.all.find(p => {
            const meta = p.getMeta('playerId');
            return meta === receiverId;
        });

        if (receiverPlayer) {
            alt.emitClient(receiverPlayer, 'phone:newMessage', messageData);
        }

        alt.log(`[PhoneService] Message sent from ${senderId} to ${receiverId}`);
        return { success: true, message: 'Message sent', messageData };
    }

    async markAsRead(playerId: number, messageIds: number[]): Promise<void> {
        if (messageIds.length === 0) return;

        const placeholders = messageIds.map(() => '?').join(',');
        await this.pool.execute(
            `UPDATE phone_messages SET is_read = TRUE 
             WHERE id IN (${placeholders}) AND receiver_id = ?`,
            [...messageIds, playerId]
        );
    }

    async getUnreadCount(playerId: number): Promise<number> {
        const [rows] = await this.pool.execute(
            'SELECT COUNT(*) as count FROM phone_messages WHERE receiver_id = ? AND is_read = FALSE',
            [playerId]
        );
        return (rows as any[])[0].count;
    }

    async deleteMessage(playerId: number, messageId: number): Promise<{ success: boolean; message: string }> {
        const [result] = await this.pool.execute(
            'DELETE FROM phone_messages WHERE id = ? AND (sender_id = ? OR receiver_id = ?)',
            [messageId, playerId, playerId]
        );

        if ((result as any).affectedRows === 0) {
            return { success: false, message: 'Message not found' };
        }

        return { success: true, message: 'Message deleted' };
    }

    // Get full phone data for player
    async getPhoneData(playerId: number): Promise<PhoneData> {
        const [contacts, messages, unreadCount] = await Promise.all([
            this.getContacts(playerId),
            this.getMessages(playerId),
            this.getUnreadCount(playerId),
        ]);

        return { contacts, messages, unreadCount };
    }

    // Find player by phone number (player ID as phone number)
    async findPlayerByNumber(number: string): Promise<number | null> {
        const playerId = parseInt(number);
        if (isNaN(playerId)) return null;

        const [rows] = await this.pool.execute(
            'SELECT id FROM players WHERE id = ?',
            [playerId]
        );

        return (rows as any[]).length > 0 ? playerId : null;
    }
}
