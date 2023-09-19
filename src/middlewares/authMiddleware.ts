import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";
import dotenv from "dotenv";
import { logger as rootLogger } from "../app";
const logger = rootLogger.child({ service: "authMiddleware" });

dotenv.config();

const WHITELISTED_USER_IDS: string[] = process.env.WHITELISTED_USER_IDS?.split(",") || [];
const IS_WHITELIST_ENABLED: boolean = process.env.IS_WHITELIST_ENABLED?.toLowerCase() === "true";

export const isUserWhitelisted = async (
    req: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
) => {
    const userID = req.session?.user?.twitchId;
    if (!IS_WHITELIST_ENABLED || (userID && WHITELISTED_USER_IDS.includes(userID))) {
        done();
    } else {
        logger.error(`Forbidden, you're not on the whitelist.`);
        reply.status(403).send({ error: "Forbidden, you're not on the whitelist." });
    }
};

export const userAuthenticated = async (
    req: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
) => {
    if (req.session?.user) {
        done();
    } else {
        logger.error(`Unauthorized not connected`);
        reply.status(401).send({ error: "Unauthorized" });
    }
};

export const isUserWhitelistedStatic = async (req, reply) => {
    const userID = req.session?.user?.twitchId;
    if (IS_WHITELIST_ENABLED && (!userID || !WHITELISTED_USER_IDS.includes(userID))) {
        logger.error(`Forbidden, you're not on the whitelist.`);
        reply.status(403).send({ error: "Forbidden, you're not on the whitelist." });
        throw new Error("Not on the whitelist");
    }
};

export const userAuthenticatedStatic = async (req, reply) => {
    if (!req.session?.user) {
        logger.error(`Unauthorized not connected`);
        reply.status(401).send({ error: "Unauthorized" });
        throw new Error("Unauthorized");
    }
};
