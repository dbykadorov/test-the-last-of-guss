import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1699000000001 implements MigrationInterface {
  name = 'InitialSchema1699000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('survivor', 'nikita', 'admin')`);
    await queryRunner.query(`CREATE TYPE "public"."rounds_status_enum" AS ENUM('cooldown', 'active', 'finished')`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "username" character varying NOT NULL,
        "password" character varying NOT NULL,
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'survivor',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rounds" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "startTime" TIMESTAMP WITH TIME ZONE NOT NULL,
        "endTime" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" "public"."rounds_status_enum" NOT NULL DEFAULT 'cooldown',
        "totalScore" bigint NOT NULL DEFAULT '0',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rounds_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "round_participants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "roundId" uuid NOT NULL,
        "score" bigint NOT NULL DEFAULT '0',
        "tapsCount" integer NOT NULL DEFAULT '0',
        "version" integer NOT NULL DEFAULT '1',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_round_participants_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_round_participants_user_round" ON "round_participants" ("userId", "roundId")`);
    await queryRunner.query(`CREATE INDEX "IDX_rounds_status" ON "rounds" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_rounds_created_at" ON "rounds" ("createdAt" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_rounds_time_range" ON "rounds" ("startTime", "endTime")`);
    await queryRunner.query(`CREATE INDEX "IDX_round_participants_round_score" ON "round_participants" ("roundId", "score" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_round_participants_user" ON "round_participants" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_role" ON "users" ("role")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_created_at" ON "users" ("createdAt" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_participants_active_rounds_score" ON "round_participants" ("score" DESC, "createdAt" DESC)`);

    await queryRunner.query(`
      ALTER TABLE "round_participants" 
      ADD CONSTRAINT "FK_round_participants_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "round_participants" 
      ADD CONSTRAINT "FK_round_participants_round" 
      FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`ALTER TABLE "rounds" ADD CONSTRAINT "CHK_rounds_time_order" CHECK ("startTime" < "endTime")`);
    await queryRunner.query(`ALTER TABLE "rounds" ADD CONSTRAINT "CHK_rounds_total_score_positive" CHECK ("totalScore" >= 0)`);
    await queryRunner.query(`ALTER TABLE "round_participants" ADD CONSTRAINT "CHK_participants_score_positive" CHECK ("score" >= 0)`);
    await queryRunner.query(`ALTER TABLE "round_participants" ADD CONSTRAINT "CHK_participants_taps_positive" CHECK ("tapsCount" >= 0)`);
    await queryRunner.query(`ALTER TABLE "round_participants" ADD CONSTRAINT "CHK_participants_version_positive" CHECK ("version" > 0)`);
    await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "CHK_users_username_not_empty" CHECK (LENGTH(TRIM("username")) > 0)`);
    await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "CHK_users_password_not_empty" CHECK (LENGTH("password") > 0)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "round_participants" DROP CONSTRAINT "FK_round_participants_round"`);
    await queryRunner.query(`ALTER TABLE "round_participants" DROP CONSTRAINT "FK_round_participants_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_participants_active_rounds_score"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_users_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_users_role"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_round_participants_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_round_participants_round_score"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_rounds_time_range"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_rounds_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_rounds_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_round_participants_user_round"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "round_participants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rounds"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."rounds_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
  }
}
