import {
  Column, CreateDateColumn, Entity,
  ManyToOne, PrimaryGeneratedColumn, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/users.entity';

@Entity()
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar', nullable: true, default: null })
  label!: string | null;

  @Column({ type: 'varchar' })
  street!: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  district!: string | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  subdistrict!: string | null;

  @Column({ type: 'varchar' })
  city!: string;

  @Column({ type: 'varchar' })
  province!: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  postalCode!: string | null;

  @Column({ type: 'varchar', default: 'Indonesia' })
  country!: string;

  @Column({ default: false })
  isDefault!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
