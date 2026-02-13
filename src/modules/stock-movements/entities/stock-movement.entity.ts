import Hashids from 'hashids';
import {
  BeforeInsert,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('stock_movements')
export class StockMovement {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new Hashids(process.env.ID_SECRET, 10).encode(Date.now());
    }
  }
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
