import {
  EmailInUseError,
  InquiryAttachmentInterpretationCapError,
  InquiryAttachmentNotFoundError,
  InquiryAttachmentTooLargeError,
  InquiryAttachmentUploadCapError,
  InquiryDailyCapReachedError,
  InquiryEmailVerificationRequiredError,
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

function clientErrorStatus(error: FastifyError): number | null {
  if (
    error.validation ||
    error instanceof InvalidInputError ||
    error instanceof InvalidAdminUserCursorError ||
    error instanceof UnknownProviderError ||
    error instanceof InvalidVerificationTokenError ||
    error instanceof InvalidInquiryQuestionError ||
    error instanceof InvalidInquiryAttachmentError ||
    error instanceof InvalidTableError ||
    error instanceof InvalidProfileImageError
  ) {
    return 400;
  }
  if (error instanceof InvalidCredentialsError) return 401;
  if (
    error instanceof InquiryEmailVerificationRequiredError ||
    error instanceof ForbiddenError ||
    error instanceof RoleChangeForbiddenError
  ) {
    return 403;
  }
  if (error instanceof InquiryAttachmentNotFoundError || error instanceof UserNotFoundError) {
    return 404;
  }
  if (error instanceof EmailInUseError) return 409;
  if (
    error instanceof InquiryAttachmentTooLargeError ||
    error instanceof ProfileImageTooLargeError
  ) {
    return 413;
  }
  if (
    error instanceof InquiryAttachmentInterpretationCapError ||
    error instanceof InquiryAttachmentUploadCapError ||
    error instanceof InquiryDailyCapReachedError
  ) {
    return 429;
  }
  if (typeof error.statusCode === "number" && error.statusCode < 500) return error.statusCode;
  return null;
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, req, reply) => {
    const status = clientErrorStatus(error);
    if (status !== null) return reply.code(status).send({ error: error.message });

    req.log.error(error);
    return reply.code(500).send({ error: "Internal server error" });
  });
}
