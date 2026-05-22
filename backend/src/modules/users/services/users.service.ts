import { Injectable } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { UsersRepository } from '../repositories/users.repository';

/**
 * Service providing methods for user profile querying and creation operations.
 */
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

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
   * Creates a new user record in the database.
   *
   * @param user - Partial user data object containing registration details.
   * @returns A promise resolving to the fully saved User entity.
   */
  async create(user: Partial<User>): Promise<User> {
    const newUser = this.usersRepository.create(user);
    return this.usersRepository.save(newUser);
  }
}
