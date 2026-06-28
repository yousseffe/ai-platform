/**
 * Immutable audit actions attached to organization model/version review workflows.
 */
export enum VersionReviewAction {
  MODEL_CREATED = 'MODEL_CREATED',
  VERSION_SUBMITTED = 'VERSION_SUBMITTED',
  TEST_CASE_ADDED = 'TEST_CASE_ADDED',
  REVIEW_APPROVED = 'REVIEW_APPROVED',
  REVIEW_DECLINED = 'REVIEW_DECLINED',
  BUILD_STARTED = 'BUILD_STARTED',
}
