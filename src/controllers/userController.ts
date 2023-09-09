import { FastifyRequest, FastifyReply, RouteGenericInterface } from "fastify";
import { userService } from "../services";

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

export const getUserFollowedStreams = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.session?.passport?.user) {
        reply.status(401).send("Unauthorized");
        return;
    }
    const userId = req.session?.passport?.user?.data[0]?.id;
    const accessToken = req.session?.passport?.user?.accessToken;
    if (!userId || !accessToken || userId == undefined) {
        reply.status(500).send("Error fetching followed streams");
        return;
    }
    try {
        const followedStreams = await userService.getUserFollowedStreams(userId, accessToken);
        reply.send(followedStreams);
    } catch (error) {
        console.error("Error fetching followed streams:", error);
        reply.status(500).send("Error fetching followed streams");
    }
};

export const getUserFollowedChannels = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.session?.passport?.user) {
        reply.status(401).send("Unauthorized");
        return;
    }
    const userId = req.session?.passport?.user?.data[0]?.id;
    const accessToken = req.session?.passport?.user?.accessToken;
    if (!userId || !accessToken || userId == undefined) {
        reply.status(500).send("Error fetching followed channels");
        return;
    }
    try {
        const followedChannels = await userService.getUserFollowedChannels(userId, accessToken);
        reply.send(followedChannels);
    } catch (error) {
        console.error("Error fetching followed channels:", error);
        reply.status(500).send("Error fetching followed channels");
    }
};

export const getUserDetail = async (req: FastifyRequest<Params>, reply: FastifyReply) => {
    const userId = req.params.id;

    if (!userId || typeof userId !== "string") {
        reply.status(400).send("Invalid user id");
        return;
    }
    try {
        const user = await userService.getUserDetailDB(userId);
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

export const getUserDetailByName = async (req: FastifyRequest<Params>, reply: FastifyReply) => {
    const username = req.params.name;
    if (!username || typeof username !== "string") {
        reply.status(400).send("Invalid user id");
        return;
    }
    try {
        if (userCacheNotFound.has(username)) {
            reply.status(404).send("User not found");
            return;
        }
        if (userCache.has(username)) {
            reply.send(userCache.get(username));
            return;
        }
        const user = await userService.getUserDetailByName(username);
        if (!user) {
            userCacheNotFound.set(username, true);
            reply.status(404).send("User not found");
            return;
        }
        userCache.set(username, user);
        reply.send(user);
    } catch (error) {
        console.error("Error fetching user details:", error);
        reply.status(500).send("Error fetching user details");
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
        const users = await userService.getMultipleUserDetailsDB(userIds);
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
        const user = await userService.updateUserDetail(userId);
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
        const message = await userService.fetchAndStoreUserDetails(userIds);
        reply.status(200).send(message);
    } catch (error) {
        console.error("Error fetching and storing user details:", error);
        reply.status(500).send("Error fetching and storing user details");
    }
};

export const updateUsers = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.session?.passport?.user) {
        reply.status(401).send("Unauthorized");
        return;
    }
    const userId = req.session?.passport?.user?.data[0]?.id;
    const accessToken = req.session?.passport?.user?.accessToken;
    if (!userId || !accessToken || userId == undefined) {
        reply.status(500).send("Error fetching followed streams");
        return;
    }
    try {
        const result = await userService.updateUsers(userId);
        reply.status(200).send(result);
    } catch (error) {
        console.error("Error updating users:", error);
        reply.status(500).send("Error updating users");
    }
};
