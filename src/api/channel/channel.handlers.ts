import { FastifyRequest, FastifyReply, RouteGenericInterface } from "fastify";
import * as channelService from "./channel";
import { logger as rootLogger } from "../../app";
const logger = rootLogger.child({ domain: "channel", service: "channelHandler" });

const userCacheNotFound = new Map();
const userCache = new Map();

interface Params extends RouteGenericInterface {
    Params: {
        id?: string;
        name?: string;
    };
}

interface Query extends RouteGenericInterface {
    Querystring: {
        userIds: string[];
    };
}

interface Body extends RouteGenericInterface {
    Body: {
        userIds: string[];
    };
}

export const getChannelDetail = async (req: FastifyRequest<Params>, reply: FastifyReply) => {
    const userId = req.params.id;

    if (!userId || typeof userId !== "string") {
        reply.status(400).send("Invalid user id");
        return;
    }
    try {
        const user = await channelService.getChannelDetailDB(userId);
        if (!user) {
            reply.status(404).send("User not found");
            return;
        }
        reply.send(user);
    } catch (error) {
        console.error("Error fetching user details:", error);
        reply.status(500).send("Error fetching user details");
    }
};

//Backend
export const getChannelDetailByName = async (req: FastifyRequest<Params>, reply: FastifyReply) => {
    const username = req.params.name;
    if (!username || typeof username !== "string") {
        reply.status(400).send({ error: "Invalid user name" });
        return;
    }
    try {
        if (userCacheNotFound.has(username)) {
            reply.send({ exists: false });
            return;
        }
        if (userCache.has(username)) {
            reply.send({ exists: true, user: userCache.get(username) });
            return;
        }
        const user = await channelService.getChannelDetailByName(username);
        if (!user) {
            userCacheNotFound.set(username, true);
            reply.send({ exists: false });
            return;
        }
        userCache.set(username, user);
        reply.send({ exists: true, user });
    } catch (error) {
        logger.error("Error fetching user details: %s", error);
        reply.status(500).send({ error: "Error fetching user details" });
    }
};

export const getMultipleUserDetailsFromDB = async (req: FastifyRequest<Query>, reply: FastifyReply) => {
    const queryUserIds = req.query.userIds;

    if (!queryUserIds) {
        reply.status(400).send("Invalid 'userIds' field");
        return;
    }
    let userIds: string[];
    if (typeof queryUserIds === "string") {
        userIds = [queryUserIds];
    } else if (Array.isArray(queryUserIds) && typeof queryUserIds[0] === "string") {
        userIds = queryUserIds as string[];
    } else {
        reply.status(400).send("Invalid 'userIds' field");
        return;
    }
    try {
        const users = await channelService.getMultipleChannelDetailsDB(userIds);
        reply.send(users);
    } catch (error) {
        console.error("Error fetching user details from database:", error);
        reply.status(500).send("Error fetching user details from database");
    }
};

export const updateUserDetail = async (req: FastifyRequest<Params>, reply: FastifyReply) => {
    const userId = req.params.id;

    if (!userId || typeof userId !== "string") {
        reply.status(400).send("Invalid user id");
        return;
    }
    try {
        const user = await channelService.updateChannelDetail(userId);
        reply.send(user);
    } catch (error) {
        console.error("Error updating user details:", error);
        reply.status(500).send("Error updating user details");
    }
};

export const fetchAndStoreUserDetails = async (req: FastifyRequest<Body>, reply: FastifyReply) => {
    const userIds = req.body.userIds;
    if (!Array.isArray(userIds) || !userIds.every((id) => typeof id === "string")) {
        reply.status(400).send("Invalid 'userIds' field");
        return;
    }
    try {
        const message = await channelService.fetchAndStoreChannelDetails(userIds);
        reply.status(200).send(message);
    } catch (error) {
        console.error("Error fetching and storing user details:", error);
        reply.status(500).send("Error fetching and storing user details");
    }
};