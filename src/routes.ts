import bcryptjs from "bcryptjs";
import "dotenv/config";
import {
	type NextFunction,
	type Request,
	type Response,
	Router,
} from "express";
import jsonwebtoken from "jsonwebtoken";
import { prisma } from "./database/prisma";

export const routes = Router();

routes.post("/users", async (req: Request, res: Response) => {
	const { name, email, password } = req.body;

	const hashedPassword = await bcryptjs.hash(password, 10);

	const verifyUser = await prisma.user.findUnique({
		where: {
			email,
		},
	});

	if (verifyUser) {
		res.status(400).json({ message: "User already exists" });
		return;
	}

	const user = await prisma.user.create({
		data: {
			name,
			email,
			password: hashedPassword,
		},
		omit: {
			password: true,
		},
	});

	res.json(user);
});

routes.get("/users", async (req: Request, res: Response) => {
	const users = await prisma.user.findMany({
		omit: {
			password: true,
		},
	});

	res.json(users);
});

routes.post("/auth/login", async (req: Request, res: Response) => {
	const { email, password } = req.body;

	const user = await prisma.user.findUnique({
		where: {
			email,
		},
	});

	if (!user) {
		res.status(404).json({ message: "User not found" });
		return;
	}

	const isPasswordCorrect = await bcryptjs.compare(password, user.password);

	if (!isPasswordCorrect) {
		res.status(401).json({ message: "Incorrect password" });
		return;
	}

	const secret = process.env.JWT_SECRET || "";

	const expiresIn = new Date();
	expiresIn.setDate(expiresIn.getDate() + 7);

	const token = jsonwebtoken.sign(
		{
			id: user.id,
			name: user.name,
			email: user.email,
		},
		secret,
		{
			expiresIn: expiresIn.getTime(),
		},
	);

	res.json({
		token,
		expiresIn: expiresIn.getTime(),
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
		},
	});
});

type UserToken = {
	id: string;
	name: string;
	email: string;
};

const verifyAuth = async (req: Request, res: Response, next: NextFunction) => {
	const authorization = req.headers.authorization;

	// Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI1ODZmYjM1LTBiNDAtNGRhNC05NDQyLWEzOGRjZWI0NWM3YSIsIm5hbWUiOiJUb2luIiwiZW1haWwiOiJ0b2luQGVtYWlsLmNvbSIsImlhdCI6MTczNjk5MTg3NywiZXhwIjoxNzM5MzMzNjY5Mzc1fQ.JZGB1LGUnpwqjSa6lGuMh1TUmcxzPAx0ipyygsyQsOw

	if (!authorization) {
		res.status(401).json({ message: "Unauthorized" });
		return;
	}

	const [, token] = authorization.split(" ");

	try {
		const decoded = jsonwebtoken.verify(token, process.env.JWT_SECRET || "");

		req.user = decoded as UserToken;

		next();
	} catch (error) {
		console.error(error);
		res.status(401).json({ message: "Unauthorized" });
	}
};

routes.get("/users/me", verifyAuth, async (req: Request, res: Response) => {
	const { id } = req.user;

	const user = await prisma.user.findUnique({
		where: {
			id,
		},
		omit: {
			password: true,
		},
	});

	if (!user) {
		res.status(404).json({ message: "User not found" });
		return;
	}

	res.json(user);
});

routes.get("/users/:id", async (req: Request, res: Response) => {
	const { id } = req.params;

	const user = await prisma.user.findUnique({
		where: {
			id,
		},
		omit: {
			password: true,
		},
	});

	if (!user) {
		res.status(404).json({ message: "User not found" });
		return;
	}

	res.json(user);
});
