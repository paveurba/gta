import { InventoryRepository } from '../repositories/inventory.repository.js';

export class InventoryService {
    constructor(private readonly inventory: InventoryRepository) {}

    async getInventoryLine(userId: number): Promise<string> {
        const items = await this.inventory.listByUser(userId);
        if (!items.length) {
            return 'Inventory is empty';
        }

        return items.map((item) => `${item.itemName} x${item.quantity}`).join(', ');
    }
}
