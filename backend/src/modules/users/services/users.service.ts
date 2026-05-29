import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { UsersRepository } from '../repositories/users.repository';
import { WalletsService } from '../../wallets/services/wallets.service';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';

/**
 * Service providing methods for user profile querying, creation, update, and role changes.
 */
@Injectable()
export class UsersService {
  constructor(
    public readonly usersRepository: UsersRepository,
    private readonly walletsService: WalletsService,
  ) {}

  /**
   * Retrieves a user from the database matching the provided email address.
   *
   * @param email - The email address to look up.
   * @returns A promise resolving to the User object if found, or null otherwise.
   */
  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  /**
   * Retrieves a user from the database matching the provided username.
   *
   * @param username - The username to look up.
   * @returns A promise resolving to the User object if found, or null otherwise.
   */
  async findOneByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ username });
  }

  /**
   * Creates a new user record in the database.
   *
   * @param user - Partial user data object containing registration details.
   * @returns A promise resolving to the fully saved User entity.
   */
  async create(user: Partial<User>): Promise<User> {
    const newUser = this.usersRepository.create(user);
    return this.usersRepository.save(newUser);
  }

  /**
   * Updates an existing user record.
   *
   * @param id - UUID of the user.
   * @param data - Columns to update.
   * @returns Fully updated user record.
   */
  async update(id: string, data: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, data);
    const updated = await this.usersRepository.findOneBy({ id });
    if (!updated) {
      throw new Error(`User with ID ${id} not found after update`);
    }
    return updated;
  }

  /**
   * Enrolls an individual user workspace to act as a Provider.
   * Initializes a PROVIDER wallet for the user.
   *
   * @param userId - Owner user UUID.
   * @returns Updated User.
   */
  async enableProvider(userId: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    if (user.isProvider) {
      return user;
    }

    await this.update(userId, { isProvider: true });
    await this.walletsService.createWallet(userId, OwnerType.USER, WalletType.PROVIDER, 0.0);

    const updated = await this.usersRepository.findOneBy({ id: userId });
    if (!updated) {
      throw new Error('User not found after update');
    }
    return updated;
  }
}
