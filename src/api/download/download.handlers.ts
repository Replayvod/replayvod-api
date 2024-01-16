import { FastifyReply, FastifyRequest, RouteGenericInterface } from "fastify";
import { jobService } from "../../services";
import { Quality } from "@prisma/client";
import { JobDetail } from "../../types/sharedTypes";
import { userFeature } from "../user";
import { channelFeature } from "../channel";
import { videoFeature } from "../video";
import { downloadFeature } from ".";

interface Params extends RouteGenericInterface {
    Params: {
        id?: string;
        quality?: string;
    };
}

export const downloadStream = async (req: FastifyRequest<Params>, reply: FastifyReply) => {
    const userId = userFeature.getUserIdFromSession(req);
    if (!userId) {
        return reply.status(401).send({ message: "Unauthorized" });
    }
    const broadcasterId = req.params.id;
    if (!broadcasterId) {
        return reply.status(400).send({ message: "Invalid broadcaster id" });
    }
    const channel = await channelFeature.getChannel(broadcasterId);
    if (!channel) {
        return reply.status(404).send({ message: "Channel not found" });
    }
    const stream = await channelFeature.getChannelStream(broadcasterId, userId);
    if (!stream) {
        return reply.status(400).send({ message: "Stream is offline" });
    }
    const pendingJob = await jobService.findPendingJobByBroadcasterId(broadcasterId);
    if (pendingJob) {
        return reply.status(400).send({
            message: "There is already a job running for this broadcaster.",
            jobId: pendingJob.id,
        });
    }
    const jobId = jobService.createJobId();
    const quality: Quality = videoFeature.mapVideoQualityToQuality(req.params.quality || "");
    const jobDetails: JobDetail = { stream, userId, channel, jobId, quality };
    await downloadFeature.handleDownload(jobDetails, broadcasterId);
    reply.send({ jobId });
};

export const getJobStatus = async (req: FastifyRequest<Params>, reply: FastifyReply) => {
    const jobId = req.params.id;
    if (!jobId) {
        return reply.status(400).send({ message: "Invalid broadcaster id" });
    }
    const status = jobService.getJobStatus(jobId);
    if (status) {
        return reply.send({ status });
    }
    reply.status(404).send({ message: "Job not found" });
};
