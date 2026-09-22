<!-- CLAUDE.md — guidance for Claude Code (claude.ai/code) when working in this repo. Distilled from AGENTS.md. -->

# CLAUDE.md

HTML Academy "Readme" course: NestJS 11 + Nx 22 monorepo, ESM (`"type": "module"`), Node 20+.

## Critical Layout
- **All code lives in `project/`. Run every `npm`, `nx`, `prisma`, and `docker compose` command from `project/`** — not the repo root.
- Repo root holds only course docs (`Readme.md`, `Workflow.md`, `Contributing.md`, `specification.md`), `markup/`, and `AGENTS.md`.
- `project/package.json` has empty `scripts: {}`. **Ignore `Workflow.md` `npm run` commands; use Nx targets.**
- `.github/workflows/check.yml` is stale/no-op (expects a root `package.json`). Verify locally.

## Commands (run from `project/`)
- Install: `npm install`
- Serve: `npx nx serve users` | `npx nx serve blog` | `npx nx serve notify` | `npx nx serve file-storage` | `npx nx serve api-gateway`
- Build: `npx nx build <app>` — **main compile check**
- Lint: `npx nx lint <app>` | all: `npx nx run-many -t lint`
- Test: `npx nx test <app>` | all: `npx nx run-many -t test` | focused: `npx nx test <app> -t "<name>"`
- Inspect targets: `npx nx show project <app>`
- Prisma (no DB needed): `npx nx db-validate <app>`, `npx nx db-generate <app>`
- Prisma (DB required): `npx nx db-migrate <app> --name <name>`, `npx nx db-reset <app>`, `npx nx db-fill <app>`

## Verification
- **Verify with `nx build` and `nx test`, not `nx typecheck`.** `typecheck` is broken: inferred target runs `tsc --build --emitDeclarationOnly`, but `@project/*` aliases map to lib source without TS project references.
- `nx run-many -t lint` is clean for all 5 apps (the old `@Body() dto: any` warning in blog is gone — the update endpoint now uses `UpdatePostDto`).
- Jest 30 runs via SWC. No `*-e2e` apps exist despite `nx.json` excludes.

## Apps
- **`users`**: Prisma + PostgreSQL. Registration, login, JWT access/refresh, password change, UUID PKs, bcrypt hashes. **Publishes `user.registered` to notify's RabbitMQ queue** on registration via its own `notify-client/` (needs `RABBITMQ_*` in `.env`). `UserService` is the module's public API; `AuthenticationService` never touches `UserRepository`.
- **`blog`**: Prisma + PostgreSQL. Posts, comments, likes, subscriptions, feed, filtering, search, pagination, RDO serialization. **No JWT here** — it trusts the `X-User-Id` header set by the gateway (`common/user-id.guard.ts` + `@RequireUserId()` + `@CurrentUserId()`). Enforces ownership (403 on someone else's post/comment), draft visibility (a draft is 404 for non-authors), published-only likes/comments/reposts, and no self-repost (409). **Publishes `post.published`** on create, repost, return from draft and edits of a published post, and **`post.unpublished`** when a published post becomes a draft or is deleted (`notify-client/`, `ClientProxy.emit`). Posts and comments are **soft-deleted** (`isDeleted` flag + `deletedAt` timestamp).
- **`file-storage`**: Prisma + PostgreSQL (metadata) + filesystem (binaries). Upload/serve files (avatars, photo-posts). Endpoints: `POST /api/files/avatar` (≤ 500 КБ), `POST /api/files/photo` (≤ 1 МБ) — both jpeg/png only, validated by magic bytes (`FileTypeValidator` in Nest 11 uses `file-type@21.3.4` on `file.buffer`, memory storage); `GET /api/files/:fileId` returns metadata + ready absolute `url`. Statics served via `app.useStaticAssets` (`NestExpressApplication`) under `/static` (outside the `api` prefix), no `@nestjs/serve-static` dependency. `FileModule` imported into `AppModule`. Sample fixtures + IntelliJ HTTP Client smoke in `apps/file-storage/file-storage.http`.
- **`notify`**: Prisma + PostgreSQL. Email newsletters (§7). Hybrid app: RabbitMQ consumer (`@EventPattern` `user.registered`, `post.published`, `post.unpublished`) + one sync HTTP trigger `POST /api/newsletters`; mail via `@nestjs-modules/mailer` → mailpit. `post.unpublished` deletes the pending `notify_posts` row, so drafts and deleted posts never reach the digest.
- **`api-gateway`** (port 3005): Stateless presentation layer — no Prisma, no compose, no DB. Locally verifies JWT (`@nestjs/jwt`, secret duplicated from `users` `.env`). Proxies HTTP to the 4 downstream services via `@nestjs/axios`. Aggregates: authors in posts/comments, user cards in subscriptions, profile counts (`postsCount` from blog `totalItems`, `subscribersCount` from blog `followers/:userId/count`). Multipart pass-through: `POST /api/auth/register` (avatar → file-storage → users), `POST /api/posts/photo` (photo → file-storage → blog). `@Catch(AxiosError)` filter passes through downstream status+body; network errors → 503. Passes the authenticated `sub` to blog as the `X-User-Id` header (`BlogClient.withUser`), so posts/likes/comments/subscriptions belong to the token owner. `AnonymousGuard` blocks registration for authenticated clients (§1.1). Swagger at `/spec` with `.addBearerAuth()`. Needs all 4 services running. Smoke in `apps/api-gateway/api-gateway.http`.

## Shared Libs (import via aliases, never relative paths)
- `@project/shared-types`: domain classes/enums/interfaces (`User`, post unions, `Comment`, `Like`, `PostType`, `TokenPayload`, `PaginationResult`) + RabbitMQ contract shared by producers/consumer (`RabbitRouting` enum, `UserRegisteredEvent`, `PostPublishedEvent`, `PostUnpublishedEvent`) + the cross-service `USER_ID_HEADER` constant (`x-user-id`).
- `@project/shared-errors`: domain error base classes + `DomainExceptionFilter`.
- `@project/shared-config`: `validateEnvironment(schema, config)`, `Environment` enum, and `registerAs` config factories `appConfig`/`postgresConfig`/`rabbitmqConfig` (+ `AppConfig`/`PostgresConfig`/`RabbitmqConfig` interfaces).
- `@project/shared-helpers`: `fillRdo`/`fillRdoList`/`fillRdoPagination` (RDO serialization) + `getPostgresConnectionString`/`getRabbitmqConnectionString` (build a connection URL from a config object).
- **Per-app `apps/<app>/src/app/config/` holds only the service's own env schema** (`EnvironmentVariables` + `validateEnv` in `env.validation.ts`), its `index.ts` barrel, and service-specific `registerAs` config (`jwt.config.ts` in `users`, `mail.config.ts` in `notify`, `storage.config.ts` in `file-storage`, `services.config.ts` + `jwt.config.ts` in `api-gateway`). Shared factories/enum/connection-string helpers come from the libs above — no per-app `helpers/` dir.

## Coding Rules
- **Module boundaries: a module exports only its service.** Repositories and Prisma tables are private to their module; other modules call the service (`AuthenticationService → UserService`, `CommentService`/`LikeService → PostService`, `PostService.findFeed → SubscriptionService.findFollowingIds`). No `*.module.ts` exports a repository.
- **RabbitMQ events are named after what happened at the producer** (`user.registered`, `post.published`), not after what the consumer will do.
- ESM project: use `.js` suffix in runtime ESM imports where required by generated/runtime scripts.
- Prettier: single quotes, 2-space indent, LF, final newline.
- **Per-feature files**: `<feature>.controller.ts`, `.service.ts`, `.module.ts`, `.repository.ts`, constants/errors, `dto/`, `rdo/`.
- Feature modules declare their controller/service/repository and are imported into `app.module.ts`.
- **DTOs** = input contracts: `class-validator` + `@ApiProperty`.
- **RDOs** = output contracts: `class-transformer` `@Expose`.
- Controllers serialize via `plainToInstance(...)` or helpers `fillRdo` / `fillRdoList` / `fillRdoPagination`.
- **Services throw domain errors from feature `*.errors.ts`, never raw Nest HTTP exceptions.**
- `main.ts`: register `DomainExceptionFilter`, global prefix `api`, Swagger at `/spec`, strict `ValidationPipe`.
- A service's own PKs are UUID. Cross-service refs (`authorId`, `userId`, `followerId`, `followingId`) are opaque `String`, no cross-service FKs.

## Prisma Stack
- Prisma 7 + PostgreSQL on `users`, `blog`, and `notify`.
- Generator is `prisma-client` (not `prisma-client-js`); output points to `apps/<app>/src/generated/prisma` (git- and eslint-ignored).
- `datasource db` has **no `url`** (forbidden in Prisma 7). CLI config lives in `apps/<app>/prisma.config.ts`, which loads `apps/<app>/.env` via `dotenv`.
- Runtime needs `@prisma/adapter-pg`. `PrismaService extends PrismaClient`, constructs `new PrismaPg({ connectionString })`. `PrismaModule` is global and exports `PrismaService`.
- Schema files: `apps/<app>/prisma/schema.prisma` only — no per-feature schema files. Repositories map Prisma records to shared domain classes.
- **`db-migrate` does NOT generate the client** under Prisma 7 + `prisma.config.ts` (verified on a clean clone). After a fresh checkout run `npx nx db-generate <app>` for all four Prisma apps, otherwise `nx build` fails with `Can't resolve '../../generated/prisma/client'`.

### Users
- Table `public.users`; id `String @id @default(uuid()) @db.Uuid`; email unique; password only as `password_hash`.
- `UserIdParamDto` validates with `@IsUUID('4')`. `POST /auth/login` returns `accessToken` + `refreshToken`; `POST /auth/refresh` exchanges a refresh token for a new pair. `UserModule` exports only `UserService` (`getById` throws `UserNotFoundError`, `create` enforces unique email with `UserAlreadyExistsError`; both errors live in `user/user.errors.ts`).
- Seed `apps/users/prisma/seed.ts`; `db-fill users` creates 3 demo users, password `secret123`.

### Blog
- Single-table inheritance: one `posts` table with `type` enum + nullable type-specific columns.
- `likesCount`/`commentsCount` come from Prisma `_count` — **do not maintain counters manually**. `commentsCount` is a filtered count (`comments: { where: { isDeleted: false } }`), so it ignores soft-deleted comments.
- **Soft delete**: `Post` and `Comment` have an `isDeleted` flag and a `deletedAt` timestamp. The flag decides: every read filters `isDeleted: false` (`NOT_DELETED` in both repositories); `softDeleteById` sets both fields. A restore would reset only the flag and keep the date. **Do not collapse the flag back into `deletedAt IS NULL`** — the mentor asked for both fields so that restoring never erases the deletion date. Migration `soft_delete_flag` backfills `is_deleted` from `deleted_at`. Comments of a deleted post are not marked separately — they become unreachable with the post (§2.3) because every comment operation checks the post first. Likes and subscriptions stay hard-deleted on purpose: they are toggles with no dependents. Reposts of a deleted original stay visible and keep `originalPostId`.
- **Sort by comments is two-phase** (`PostRepository.findPageByCommentsCount`): Prisma cannot `orderBy` a filtered relation count, so posts with live comments come from `comment.groupBy` ordered by count, then posts without live comments by `publishedAt`. Do not switch it back to `orderBy: { comments: { _count } }` — that counts deleted comments.
- Tags are many-to-many, normalized to lowercase in service logic. Feed = subscriptions + own posts.
- `authorId`, `userId`, `followerId`, `followingId`, `originalAuthorId` are opaque Users ids.
- New endpoint `GET /api/subscriptions/followers/:userId/count` → `{ count }` (added for API Gateway profile aggregation).
- Protected routes use `@RequireUserId()` (guard + Swagger header) and read the id via `@CurrentUserId()`. Public: post list, single post, search, comment list, followers count.
- `PostService.findPost(id, requesterId?)` hides other people's drafts behind 404; `findPublishedPost(id)` is the gate for likes, comments and reposts.
- Tag rules live in `post.constant.ts` (`MAX_TAGS_COUNT`, `TAG_PATTERN`, `TAG_VALIDATION_MESSAGE`) and are applied via `@Matches(..., { each: true })` in every create/update DTO.
- `UpdatePostDto` is fully validated and also carries `publishedAt` (§2.11) and `status` (§2.12). `PostService.updatePost` merges only defined fields — compiled DTOs carry `undefined` own properties.
- Search matches individual words (`OR` over `contains`), not the whole phrase (§8.2).
- Smoke examples in `apps/blog/blog.http`.

### API Gateway
- Stateless (port 3005): no Prisma, no compose, no DB. `JWT_ACCESS_TOKEN_SECRET` must match `apps/users/.env` byte-for-byte.
- `@nestjs/axios` (`HttpModule.registerAsync`) proxies to 4 downstream services. `ClientsModule` exports 4 clients + `HttpModule` (so `HttpService` is available via DI). `@Catch(AxiosError)` filter passes through status+body; network errors → 503.
- `JwtAuthGuard` verifies Bearer locally; `@CurrentUser('sub')` gives user id. `@ApiBearerAuth()` on protected routes.
- Author enrichment: `UsersClient.getUserInfoMap(ids)` — errors and non-UUID ids → `null` (non-UUID ids skip the request: users would answer 400). Nested RDOs need `@Type(() => UserInfoRdo)`.
- Multipart pass-through: register (avatar → file-storage → users), photo post (photo → file-storage → blog). Limits duplicated in `common/upload.constant.ts`.
- Gateway create-DTOs omit `type`; service adds it before calling blog. `UpdatePostDto` is all-optional.
- `GET /api/users/:id` aggregates `postsCount` (blog `totalItems`) + `subscribersCount` (blog `followers/:userId/count`).
- `BlogClient.withUser(userId)` adds the `X-User-Id` header to every user-scoped blog call; controllers take `@CurrentUser('sub')` and pass it into the services.
- `AnonymousGuard` (`common/anonymous.guard.ts`) rejects registration when a valid Bearer token is present → `AlreadyAuthenticatedError` (403). `OptionalJwtAuthGuard` keeps `GET /api/posts/:id` public but fills `request.user` when a token is supplied, so an author can open their own draft by id. `POST /api/auth/refresh` proxies to users.
- Gateway tag constants are duplicated in `posts/posts.constant.ts` (cross-app imports are forbidden, same as `common/upload.constant.ts`). Smoke in `apps/api-gateway/api-gateway.http`.

## HTTP Smoke Files
- `*.http` are **IntelliJ HTTP Client** files, not VS Code REST Client — the dialects are not interchangeable.
- Chain response values with `> {% client.global.set('postId', response.body.id); %}` and use `{{postId}}`. **Never** `{{createPost.response.body.id}}` — that is REST Client syntax and WebStorm reports `Cannot resolve variable`.
- Each app ships `http-client.env.json` with a `development` environment. The per-file selection lives in git-ignored `.idea/workspace.xml`; if the selected environment is missing, **every** variable in the file is flagged, in-place ones included.
- In-place `@name = value` beats environment values, so static values are intentionally duplicated in both places. Keep them in sync.
- **Smoke files must survive a re-run against the same DB — never hard-code a registration email.** `api-gateway.http` registers `alice-{{$random.alphanumeric(8)}}@example.com` and saves the address from the response (`client.global.set('email', response.body.email)`); login and the 409 duplicate check use `{{email}}` / `{{secondEmail}}`. A fixed email returns 409 on the second run, `userId` stays unset and every `{{userId}}` URL fails.
- Check a file without the IDE: `docker run --rm -v "$PWD:/workdir" jetbrains/intellij-http-client -D -e development -v /workdir/apps/blog/http-client.env.json /workdir/apps/blog/blog.http`

## Gotchas
- Numeric env vars need explicit `: number` types in `EnvironmentVariables`, else SWC decorator metadata mis-converts strings.
- Post create DTO `type` fields need validators like `@Equals(PostType.X)`, else `ValidationPipe({ whitelist: true })` strips them.
- Host ports: `blog` Postgres `5433`, `users` Postgres `5434`, `notify` Postgres `5435`, `file-storage` app `3004` / Postgres `5436` / pgAdmin `8085` (avoid local `5432` conflict). `notify` also: RabbitMQ `5672`/`15672`, Mailpit `1025`/`8025`, pgAdmin `8084`. `api-gateway` app `3005` (stateless, no DB/compose).
- `@IsUrl()` defaults reject `http://localhost:...` URLs — needs `require_tld: false`. Fixed: `file-storage` (`STATIC_BASE_URL`), `users` (`avatarUrl`), `blog` (`photoUrl`), and `api-gateway` (all `*_SERVICE_URL`). Gateway's `UpdatePostDto` also uses `require_tld: false` for `photoUrl`/`link`.
- `FileTypeValidator` (Nest 11) validates by magic bytes via `file-type@21.3.4` on `file.buffer`; needs multer memory storage (the default — do not switch to disk storage). Regex matches the *detected* mime (`image/jpeg`, not `image/jpg`).
- pgAdmin rejects reserved domains (`admin@readme.local`); use `admin@readme.com`.
- `tsconfig.app.json` intentionally includes `prisma.config.ts` and `prisma/**/*.ts` so `import.meta` compiles.
- `.env` files are git-ignored — copy from the per-app `.env.example`. Old Mongo data under `apps/users/mongodb/` is unused.
- Builds use tsc with `target: es2023`, so declared-but-unset DTO fields exist as own `undefined` properties. Never `Object.assign` a DTO onto a domain object without filtering them out.

## Local Infra
- Users: `docker compose -f apps/users/compose.yaml up -d` → DB `localhost:5434` `readme-users` (admin/test), pgAdmin `http://localhost:8083`. Needs notify's RabbitMQ running to publish `user.registered`.
- Launch instructions for the whole project live in the root `specification.md`.
- Blog: `docker compose -f apps/blog/compose.yaml up -d` → DB `localhost:5433` `readme-blog` (admin/test), pgAdmin `http://localhost:8082`.
- Notify: `docker compose -f apps/notify/compose.yaml up -d` → RabbitMQ AMQP `localhost:5672` + UI `http://localhost:15672` (admin/test), DB `localhost:5435` `readme-notify` (admin/test), pgAdmin `http://localhost:8084`, Mailpit SMTP `localhost:1025` + UI `http://localhost:8025`.
- File-storage: `docker compose -f apps/file-storage/compose.yaml up -d` → DB `localhost:5436` `readme-file-storage` (admin/test), pgAdmin `http://localhost:8085`. App on `http://localhost:3004/api`, static files at `http://localhost:3004/static`.
- API Gateway: **no compose** — stateless. App on `http://localhost:3005/api`, Swagger `http://localhost:3005/spec`. Requires all 4 downstream services running. `.env` must have `JWT_ACCESS_TOKEN_SECRET` byte-identical to `apps/users/.env`.
- Renamed-from-Mongo containers: add `--remove-orphans`. Credential changes ignored → stop compose, remove `apps/<app>/postgres`, restart.

## Git
- **Never commit to `master`.** Branch per task: `moduleN-taskM`. Check with `git branch --show-current`.
