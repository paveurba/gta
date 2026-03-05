import { InventoryRepository } from '../repositories/inventory.repository';

export class InventoryService {
  public constructor(private readonly inventory: InventoryRepository) {}

  public async getInventoryLine(userId: number): Promise<string> {
    const items = await this.inventory.listByUser(userId);
    if (!items.length) {
      return 'Inventory is empty';
    }

    return items.map((item) => `${item.itemName} x${item.quantity}`).join(', ');
  }
}
