import { webhookEventLogger } from "../middlewares/loggerMiddleware";
import { userService, webhookService } from "../services";
import TwitchAPI from "../utils/twitchAPI";
import { EventSub } from "../models/webhookModel";
import { getDbInstance } from "../models/db";
import { v4 as uuidv4 } from "uuid";

const twitchAPI = new TwitchAPI();

export const subToAllStreamEventFollowed = async () => {
    const followedChannelsArr = await userService.getUserFollowedChannelsDb();
    let responses = [];
    for (const followedChannels of followedChannelsArr) {
        for (const channel of followedChannels.channels) {
            try {
                const respOnline = await subscribeToStreamOnline(channel.broadcaster_id);
                const respOffline = await subscribeToStreamOffline(channel.broadcaster_id);
                responses.push({ channel: channel.broadcaster_id, online: respOnline, offline: respOffline });
            } catch (error) {
                responses.push({ channel: channel.broadcaster_id, error: error.message });
            }
        }
    }
    for (const resp of responses) {
        if (resp.error) {
            webhookEventLogger.error(`Channel ${resp.channel} - Error: ${resp.error}`);
        } else {
            webhookEventLogger.info(
                `Channel ${resp.channel} - Online Response: ${resp.online}, Offline Response: ${resp.offline}`
            );
        }
    }
};

export const subscribeToStreamOnline = async (userId: string) => {
    return await twitchAPI.createEventSub(
        "stream.online",
        "1",
        { broadcaster_user_id: userId },
        {
            method: "webhook",
            callback: webhookService.getCallbackUrlWebhook(),
            secret: webhookService.getSecret(),
        }
    );
};

export const subscribeToStreamOffline = async (userId: string) => {
    return await twitchAPI.createEventSub(
        "stream.offline",
        "1",
        { broadcaster_user_id: userId },
        {
            method: "webhook",
            callback: webhookService.getCallbackUrlWebhook(),
            secret: webhookService.getSecret(),
        }
    );
};

export const getEventSub = async (userId: string) => {
    const db = await getDbInstance();
    const collection = db.collection("eventSub");
    const fetchLogCollection = db.collection("fetchLog");
    const fetchLog = await fetchLogCollection.findOne(
        { userId: userId, type: "eventSub" },
        { sort: { fetchedAt: -1 } }
    );
    if (fetchLog && fetchLog.fetchedAt > new Date(Date.now() - 5 * 60 * 1000)) {
        const recentData = await collection.findOne({ userId: userId });
        if (!recentData) {
            return { data: [], message: "There is no EventSub subscription" };
        }
        return recentData;
    }
    const fetchId = uuidv4();
    const response = await twitchAPI.getEventSub();
    await fetchLogCollection.insertOne({
        userId: userId,
        fetchedAt: new Date(),
        fetchId: fetchId,
        type: "eventSub",
    });
    if (response && response.total === 0) {
        return { data: [], message: "There is no EventSub subscription" };
    }
    const data = await Promise.all(
        response.data.map(async (eventSub: any): Promise<EventSub> => {
            const user = await userService.getUserDetailDB(
                eventSub.condition.broadcaster_user_id || eventSub.condition.user_id
            );
            return {
                id: eventSub.id,
                status: eventSub.status,
                type: eventSub.type,
                user_id: eventSub.condition.broadcaster_user_id || eventSub.condition.user_id,
                user_login: user.login,
                created_at: new Date(eventSub.created_at),
                cost: eventSub.cost,
            };
        })
    );
    const result = await storeEventSub(data, userId, fetchId);
    return { data: data, message: result };
};

export const storeEventSub = async (eventSubs: EventSub[], userId: string, fetchId: string) => {
    const db = await getDbInstance();
    const eventSubCollection = db.collection("eventSub");
    await eventSubCollection.replaceOne(
        { userId: userId },
        { userId: userId, data: eventSubs, fetchedAt: new Date(), fetchId },
        { upsert: true }
    );
    return "EventSub subscriptions stored successfully.";
};

export const getTotalCost = async () => {
    const response = await twitchAPI.getEventSub();
    if (response && response.total === 0) {
        return { data: null, message: "There is no EventSub subscription" };
    }
    return {
        data: {
            total: response.total,
            total_cost: response.total_cost,
            max_total_cost: response.max_total_cost,
        },
        message: "Total cost retrieved successfully",
    };
};

export default {
    subToAllStreamEventFollowed,
    subscribeToStreamOnline,
    subscribeToStreamOffline,
    getEventSub,
    storeEventSub,
    getTotalCost,
};
