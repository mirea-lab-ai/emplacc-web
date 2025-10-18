// src/features/user/userCache.ts
import { fetchAllUsers, type UIUser } from './api';

class UserCache {
  private users: Map<string, UIUser> = new Map();
  private loading = false;
  private loaded = false;

  async loadAllUsers(): Promise<void> {
    if (this.loading || this.loaded) return;

    this.loading = true;
    try {
      // Загружаем всех пользователей (увеличим pageSize для получения всех за один запрос)
      const allUsers = await fetchAllUsers(1, 1000);
      this.users.clear();
      allUsers.forEach(user => {
        this.users.set(user.id, user);
      });
      this.loaded = true;
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      this.loading = false;
    }
  }

  getUser(userId: string): UIUser | undefined {
    return this.users.get(userId);
  }

  getUserEmail(userId: string): string | undefined {
    const user = this.users.get(userId);
    return user?.email;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  isLoading(): boolean {
    return this.loading;
  }
}

// Глобальный экземпляр кэша
export const userCache = new UserCache();

// Функция для инициализации кэша (вызвать при старте приложения)
export async function initializeUserCache(): Promise<void> {
  await userCache.loadAllUsers();
}