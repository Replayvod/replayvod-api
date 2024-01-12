import { FastifyInstance } from "fastify";
import { isUserWhitelisted, userAuthenticated } from "../../middlewares/authMiddleware";
import { twitchHandler } from ".";

export default function (fastify: FastifyInstance, opts: any, done: any) {
    fastify.addHook("preHandler", async (request, reply) => {
        await isUserWhitelisted(request, reply);
        await userAuthenticated(request, reply);
    });

    fastify.get("/update/games", {
        handler: twitchHandler.fetchAndSaveGames,
    });

    fastify.get("/eventsub/subscriptions", {
        handler: twitchHandler.getListEventSub,
    });

    fastify.get("/eventsub/costs", {
        handler: twitchHandler.getTotalCost,
    });

    done();
}
