import z from "zod";

export const RefreshTokenInput = z.object({
  roomName: z.string().min(1).max(100),
});

export const UpdateParticipantStatusInput = z.object({
  roomName: z.string().min(1).max(100),
  status: z.enum(["connected", "reconnecting"]),
});

export const IncrementReconnectionCountInput = z.object({
  roomName: z.string().min(1).max(100),
});
