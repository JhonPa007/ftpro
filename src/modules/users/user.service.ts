// src/modules/users/user.service.ts
import prisma from '../../shared/prisma.js';
import bcrypt from 'bcrypt';

export class UserService {
    async listUsers() {
        return await prisma.usuario.findMany({
            select: { id: true, nombre: true, username: true, rol: true, permisos: true, activo: true }
        });
    }

    async createUser(data: any) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        return await prisma.usuario.create({
            data: {
                ...data,
                password: hashedPassword
            }
        });
    }

    async updateUser(id: string, data: any) {
        if (data.password) {
            data.password = await bcrypt.hash(data.password, 10);
        }
        return await prisma.usuario.update({
            where: { id },
            data
        });
    }

    async deleteUser(id: string) {
        return await prisma.usuario.delete({ where: { id } });
    }

    async authenticate(username: string, password_raw: string) {
        const user = await prisma.usuario.findUnique({ where: { username } });
        if (!user) return null;

        const valid = await bcrypt.compare(password_raw, user.password);
        if (!valid) return null;

        const { password, ...safeUser } = user;
        return safeUser;
    }
}
