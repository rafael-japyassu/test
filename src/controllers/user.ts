import { prisma } from "../database/prisma";

export class UserController {
	async findAll() {
		const users = await prisma.user.findMany({
			omit: {
				password: true,
			},
		});

		return users.map((user) => ({
			id: user.id,
			name: user.name,
			email: user.email,
		}));
	}
}
