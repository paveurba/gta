import { RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../services/database.service';

interface InventoryRow extends RowDataPacket {
  item_name: string;
  quantity: number;
}

export class InventoryRepository {
  public constructor(private readonly database: DatabaseService) {}

  public async listByUser(userId: number): Promise<Array<{ itemName: string; quantity: number }>> {
    const rows = await this.database.query<InventoryRow[]>(
      'SELECT item_name, quantity FROM inventory_items WHERE user_id = :user_id ORDER BY item_name ASC',
      { user_id: userId },
    );

    return rows.map((item) => ({ itemName: item.item_name, quantity: item.quantity }));
  }
}
