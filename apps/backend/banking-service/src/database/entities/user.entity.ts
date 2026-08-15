import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 100, name: 'full_name' })
  fullName!: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;
}
