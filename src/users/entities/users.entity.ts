import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum Gender {
  MALE   = 'MALE',
  FEMALE = 'FEMALE',
}

export interface Address {
  street?:       string;
  district?:     string;
  subdistrict?:  string;
  city?:         string;
  province?:     string;
  postalCode?:   string;
  country?:      string;
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true })
  username!: string;

  @Column({ default: 'USER' })
  role!: string;

  @Column()
  password!: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  firstName!: string | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  lastName!: string | null;

  @Column({ type: 'date', nullable: true, default: null })
  dob!: string | null;

  @Column({ type: 'enum', enum: Gender, nullable: true, default: null })
  gender!: Gender | null;

  @Column({ type: 'varchar', unique: true, nullable: true, default: null })
  phone!: string | null;

  @Column({ type: 'jsonb', nullable: true, default: null })
  address!: Address | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  profilePhotoUrl!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
