import Hashids from "hashids";
import { BeforeInsert, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity('order_items')
export class OrderItem {
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
