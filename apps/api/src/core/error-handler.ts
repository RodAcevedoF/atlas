import {
  EmailInUseError,
  InquiryAttachmentInterpretationCapError,
  InquiryAttachmentNotFoundError,
  InquiryAttachmentTooLargeError,
  InquiryAttachmentUploadCapError,
  InquiryDailyCapReachedError,
  InvalidAdminUserCursorError,
  InvalidCredentialsError,
  InvalidInquiryAttachmentError,
  InvalidInquiryQuestionError,
  InvalidProfileImageError,
  InvalidTableError,
  InvalidVerificationTokenError,
  ProfileImageTooLargeError,
  RoleChangeForbiddenError,
  UnknownProviderError,
  UserNotFoundError,
} from "@atlas/application";
import type { FastifyError, FastifyInstance } from "fastify";
import { ForbiddenError, InvalidInputError } from "./errors.ts";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, req, reply) => {
    if (error.validation) return reply.code(400).send({ error: error.message });
    if (error instanceof InvalidInputError) return reply.code(400).send({ error: error.message });
    if (error instanceof InvalidAdminUserCursorError)
      return reply.code(400).send({ error: error.message });
    if (error instanceof UnknownProviderError)
      return reply.code(400).send({ error: error.message });
    if (error instanceof InvalidVerificationTokenError)
      return reply.code(400).send({ error: error.message });
    if (error instanceof InvalidCredentialsError) {
      return reply.code(401).send({ error: error.message });
    }
    if (error instanceof InvalidInquiryQuestionError)
      return reply.code(400).send({ error: error.message });
    if (error instanceof InvalidInquiryAttachmentError || error instanceof InvalidTableError)
      return reply.code(400).send({ error: error.message });
    if (error instanceof InquiryAttachmentNotFoundError)
      return reply.code(404).send({ error: error.message });
    if (error instanceof InquiryAttachmentTooLargeError)
      return reply.code(413).send({ error: error.message });
    if (error instanceof InquiryAttachmentInterpretationCapError)
      return reply.code(429).send({ error: error.message });
    if (error instanceof InquiryAttachmentUploadCapError)
      return reply.code(429).send({ error: error.message });
    if (error instanceof InvalidProfileImageError)
      return reply.code(400).send({ error: error.message });
    if (error instanceof ProfileImageTooLargeError)
      return reply.code(413).send({ error: error.message });
    if (error instanceof InquiryDailyCapReachedError)
      return reply.code(429).send({ error: error.message });
    if (error instanceof EmailInUseError) return reply.code(409).send({ error: error.message });
    if (error instanceof UserNotFoundError) return reply.code(404).send({ error: error.message });
    if (error instanceof ForbiddenError) return reply.code(403).send({ error: error.message });
    if (error instanceof RoleChangeForbiddenError)
      return reply.code(403).send({ error: error.message });

    if (typeof error.statusCode === "number" && error.statusCode < 500) {
      return reply.code(error.statusCode).send({ error: error.message });
    }

    req.log.error(error);
    return reply.code(500).send({ error: "Internal server error" });
  });
}
