# AGENTS.md

HTML Academy "Readme" course project: NestJS 11 + Nx 22 monorepo, ESM, `"type": "module"`.

## Critical Layout
- All real code is in `project/`. Run every `npm`, `nx`, `prisma`, and `docker compose` command from `project/`, not from the repo root.
- The repo root only holds course docs (`Readme.md`, `Workflow.md`, `Contributing.md`, `specification.md`), `markup/`, and this `AGENTS.md`.
- `project/package.json` has empty `scripts: {}`. Ignore `Workflow.md` commands like `npm run compile|build|lint|start|ts`; use Nx targets instead.
- `.github/workflows/check.yml` is stale/no-op because it expects a root `package.json`. Use Node 20+ locally.

## Commands
- Install: `npm install`
- Serve users: `npx nx serve users`
- Serve blog: `npx nx serve blog`
- Serve notify: `npx nx serve notify` (hybrid app: HTTP + RabbitMQ consumer)
- Serve file-storage: `npx nx serve file-storage`
- Serve api-gateway: `npx nx serve api-gateway` (stateless, needs 4 downstream services running)
- Build one app: `npx nx build users`, `npx nx build blog`, `npx nx build notify`, `npx nx build file-storage`, or `npx nx build api-gateway`
- Lint one app: `npx nx lint users`, `npx nx lint blog`, `npx nx lint notify`, `npx nx lint file-storage`, or `npx nx lint api-gateway`
- Lint all: `npx nx run-many -t lint`
- Test one app: `npx nx test users`, `npx nx test blog`, `npx nx test notify`, `npx nx test file-storage`, or `npx nx test api-gateway`
- Test all: `npx nx run-many -t test`
- Focused Jest test: `npx nx test <app> -t "<name>"`
- Inspect targets: `npx nx show project <app>` (`users` | `blog` | `notify` | `file-storage` | `api-gateway`)
- Prisma validate: `npx nx db-validate <app>`
- Prisma generate: `npx nx db-generate <app>`
- Prisma migrate: `npx nx db-migrate <app> --name <name>`
- Prisma reset: `npx nx db-reset <app>`
- Prisma seed: `npx nx db-fill <app>`

## Verification Status
- `npx nx build <app>` works and is the main compile check.
- `npx nx test <app>` works with Jest 30 via SWC.
- `npx nx run-many -t lint` is clean for all 5 apps. The old `update(@Body() dto: any)` warning in blog is gone: the endpoint now takes a validated `UpdatePostDto`.
- `npx nx lint notify` and `npx nx build notify` are clean. Note: `notify`'s `webpack.config.js` sets `useTsconfigPaths: true` so the build resolves `@project/*` aliases.
- `npx nx lint file-storage`, `npx nx build file-storage`, and `npx nx test file-storage` are clean. `file-storage`'s `webpack.config.js` also sets `useTsconfigPaths: true` for `@project/*` resolution.
- `npx nx lint api-gateway`, `npx nx build api-gateway`, and `npx nx test api-gateway` are clean. `api-gateway`'s `webpack.config.js` also sets `useTsconfigPaths: true` for `@project/*` resolution. `api-gateway` has no Prisma targets (no DB).
- `npx nx typecheck <app>` is still a known problem: inferred Nx target runs `tsc --build --emitDeclarationOnly`, while workspace aliases map `@project/*` to lib source without TS project references. Use `nx build` and `nx test` as verification until a project-references migration is done.
- `users`, `blog`, `notify`, and `file-storage` use Prisma DB targets. `db-validate` and `db-generate` do not need a running DB. `db-migrate`, `db-reset`, and `db-fill` need Postgres up. `db-migrate` does **not** imply `db-generate` — see the Prisma Stack section. `file-storage` has no `db-fill` (no seed). `api-gateway` has no Prisma targets.

## Apps
- `users`: Prisma + PostgreSQL service. Implements registration, login, JWT access/refresh tokens, password change, Prisma-backed user repository, UUID primary keys, bcrypt password hashes. Publishes `add.subscriber` to notify's RabbitMQ queue on registration via its own `notify-client/` feature, so every registered user receives the newsletter (§7.2). Requires `RABBITMQ_*` in `apps/users/.env`.
- `blog`: Prisma + PostgreSQL service. Implements posts, comments, likes, subscriptions, feed, filtering, search, pagination, and RDO serialization. It does not verify JWT: the current user arrives in the `X-User-Id` header set by the API Gateway (`common/user-id.guard.ts`, `@RequireUserId()`, `@CurrentUserId()`). Enforces ownership and status rules: 403 on editing/deleting someone else's post or deleting someone else's comment, another author's draft is 404, likes/comments/reposts only target published posts, and reposting your own post is 409. Publishes an `add.post` event to notify's RabbitMQ queue on post create/repost via the `notify-client/` feature (`ClientProxy.emit`).
- `file-storage`: Prisma + PostgreSQL (metadata) + filesystem (binaries) service. Implements upload/serve of files (avatars, photo-posts). Endpoints: `POST /api/files/avatar` (≤ 500 КБ), `POST /api/files/photo` (≤ 1 МБ) — both jpeg/png only, validated by magic bytes via `FileTypeValidator` (Nest 11 default, `file-type@21.3.4` on `file.buffer`; multer memory storage); `GET /api/files/:fileId` returns metadata RDO + a ready absolute `url`. Statics served through `app.useStaticAssets` (`NestExpressApplication`) under `/static` (outside the `api` prefix); no `@nestjs/serve-static` dependency. `FileModule` is imported into `AppModule`. Magic numbers: app `3004`, Postgres `5436`, pgAdmin `8085`. Sample fixtures + REST Client smoke in `apps/file-storage/file-storage.http`. No seed (no `db-fill` target).
- `notify`: Prisma + PostgreSQL service for email newsletters (§7). Hybrid app: a RabbitMQ consumer (`@EventPattern` for `add.subscriber` and `add.post`) plus one synchronous HTTP trigger `POST /api/newsletters`. Sends mail via `@nestjs-modules/mailer` to a Mailpit fake SMTP. `blog` publishes `add.post`, `users` publishes `add.subscriber`. The message contract (`RabbitRouting` enum, `PostNotification`, `SubscriberNotification`) lives in `@project/shared-types`.
- `api-gateway`: Stateless presentation layer (port 3005) — no Prisma, no compose, no DB. Locally verifies JWT access tokens with `@nestjs/jwt` (the `JWT_ACCESS_TOKEN_SECRET` is duplicated byte-for-byte from `apps/users/.env`; there is no `/check` endpoint in users). Proxies HTTP to the 4 downstream services via `@nestjs/axios` (`HttpModule.registerAsync` with timeout from `services` config). Aggregates data: authors in posts/comments (`getUserInfoMap` — dedupes `authorId`s, `Promise.all`, error/non-UUID e.g. `stub-user-id` → `null`), user cards in subscriptions (`followingId` → user), profile counts (`postsCount` from blog `totalItems` with `limit=1`, `subscribersCount` from the new blog endpoint `GET /api/subscriptions/followers/:userId/count`). Multipart pass-through: `POST /api/auth/register` (avatar → file-storage `/files/avatar` → users `/auth/register` with `avatarUrl`), `POST /api/posts/photo` (photo → file-storage `/files/photo` → blog `/posts/photo` with `photoUrl`). No separate `/api/files/*` in the gateway. A global `@Catch(AxiosError)` filter passes through downstream status+body as-is; network errors (no `response`) → 503. Protected routes use `JwtAuthGuard` + `@ApiBearerAuth()`. Blog still uses `STUB_USER_ID` — posts created through the gateway are attributed to the stub user; passing the real `userId` from the token into blog is the next integration task. Refresh endpoint and personal messages (messages.html) are out of scope. Swagger at `/spec` with `.addBearerAuth()`. `webpack.config.js` sets `useTsconfigPaths: true` for `@project/*` resolution. Smoke in `apps/api-gateway/api-gateway.http`.
- No `*-e2e` apps exist, though `nx.json` still lists them in Jest excludes.

## Shared Libs
- `@project/shared-types`: domain classes/enums/interfaces (`User`, post union types, `Comment`, `Like`, `PostType`, `TokenPayload`, `PaginationResult`, etc.), the RabbitMQ contract shared by producers and consumer (`RabbitRouting` enum, `PostNotification`, `SubscriberNotification`), and the cross-service `USER_ID_HEADER` constant (`x-user-id`) used by the gateway and blog.
- `@project/shared-errors`: domain error base classes and `DomainExceptionFilter`.
- `@project/shared-config`: shared env/config infrastructure — `validateEnvironment(schema, config)`, the `Environment` enum, and the `registerAs` factories `appConfig`, `postgresConfig`, `rabbitmqConfig` (with their `AppConfig`/`PostgresConfig`/`RabbitmqConfig` interfaces).
- `@project/shared-helpers`: RDO serialization helpers `fillRdo`, `fillRdoList`, `fillRdoPagination`, plus connection-string builders `getPostgresConnectionString` and `getRabbitmqConnectionString` (build a URL from a config object).
- Each app keeps only its own env contract in `apps/<app>/src/app/config/`: `EnvironmentVariables` + `validateEnv` in `env.validation.ts`, the `index.ts` barrel, and any service-specific `registerAs` config (`jwt.config.ts` in `users`, `mail.config.ts` in `notify`, `storage.config.ts` in `file-storage`, `services.config.ts` + `jwt.config.ts` in `api-gateway`). There is no per-app `helpers/` directory — the shared factories, `Environment` enum, and connection-string builders are imported from the libs above.

## Conventions
- ESM project. Use `.js` suffix in runtime ESM imports where required by generated/runtime scripts.
- Prettier: single quotes, 2-space indent, LF, final newline.
- Import shared libs via aliases like `@project/shared-types`, not relative paths.
- Per feature: `<feature>.controller.ts`, `<feature>.service.ts`, `<feature>.module.ts`, `<feature>.repository.ts`, constants/errors, `dto/`, `rdo/`.
- Prisma schema files live in `apps/<app>/prisma/schema.prisma`. Do not add per-feature schema files for Prisma apps.
- Feature modules declare their controller/service/repository and are imported into `app.module.ts`.
- DTOs are input contracts with `class-validator` and `@ApiProperty`.
- RDOs are output contracts with `class-transformer` `@Expose`.
- Controllers serialize via `plainToInstance(...)` or shared helpers like `fillRdo`, `fillRdoList`, `fillRdoPagination`.
- Services throw domain errors from feature `*.errors.ts`, not raw Nest HTTP exceptions.
- `main.ts` registers `DomainExceptionFilter`.
- `main.ts` uses global prefix `api`, Swagger at `/spec`, and strict `ValidationPipe`.
- A service's own primary keys are UUID.
- Cross-service references like `authorId`, `userId`, `followerId`, `followingId` are opaque `String` values without cross-service foreign keys.

## Prisma Stack
- `users`, `blog`, `notify`, and `file-storage` use Prisma 7 with PostgreSQL.
- Generator is `prisma-client`, not `prisma-client-js`.
- Generator output is required and points to `apps/<app>/src/generated/prisma`.
- Generated Prisma clients are git-ignored and eslint-ignored.
- **`db-migrate` does not generate the client.** Under Prisma 7 with `prisma.config.ts`, `prisma migrate dev` applies the migrations but leaves `apps/<app>/src/generated/prisma` untouched — verified by deploying a clean clone of the repository. On a fresh checkout run `npx nx db-generate <app>` for all four Prisma apps **before** building or serving, otherwise the build fails with `Module not found: Error: Can't resolve '../../generated/prisma/client'`. The root `specification.md` documents this as its own step ahead of the migrations.
- Prisma `datasource db` has no `url`; Prisma 7 forbids it in schema.
- CLI connection config lives in `apps/<app>/prisma.config.ts`.
- `prisma.config.ts` explicitly loads `apps/<app>/.env` with `dotenv`.
- Runtime client requires `@prisma/adapter-pg`.
- `PrismaService extends PrismaClient` and constructs `new PrismaPg({ connectionString })`.
- `PrismaModule` is global and exports `PrismaService`.
- Repositories map Prisma records to shared domain classes.

## Users Service
- Prisma schema: `apps/users/prisma/schema.prisma`.
- Runtime Prisma wrapper: `apps/users/src/app/prisma/`.
- User table: `public.users`.
- User id is UUID: `String @id @default(uuid()) @db.Uuid`.
- Email is unique.
- Password is stored only as `password_hash`.
- `UserIdParamDto` validates ids with `@IsUUID('4')`.
- `POST /auth/login` returns `accessToken` and `refreshToken`; `POST /auth/refresh` exchanges a valid refresh token for a fresh pair (`AuthenticationService.verifyRefreshToken` → `InvalidRefreshTokenError` on a bad/expired token).
- `UserModule` holds only `UserRepository` — the empty `UserController`/`UserService`/`UpdateUserDto` stubs are gone; all HTTP routes live in `AuthenticationModule`.
- Seed file: `apps/users/prisma/seed.ts`.
- `npx nx db-fill users` creates 3 demo users.
- Demo users use password `secret123`.
- In WebStorm Database panel connect to `localhost:5434`, database `readme-users`, schema `public`, table `users`.

## Blog Service
- Prisma schema: `apps/blog/prisma/schema.prisma`.
- Runtime Prisma wrapper: `apps/blog/src/app/prisma/`.
- Posts use single-table inheritance: one `posts` table with `type` enum and nullable type-specific columns.
- `likesCount` and `commentsCount` come from Prisma `_count`; do not maintain counters manually.
- Tags are many-to-many and normalized to lowercase in service logic.
- Feed uses `subscriptions` plus current user's own posts.
- `authorId`, `userId`, `followerId`, `followingId`, and `originalAuthorId` are opaque user ids from Users.
- New endpoint `GET /api/subscriptions/followers/:userId/count` → `{ count }` (added for API Gateway profile aggregation; `SubscriptionRepository.countByFollowing` + `SubscriptionService.countFollowers`).
- Auth: `@RequireUserId()` (from `common/require-user-id.decorator.ts`) bundles `UseGuards(UserIdGuard)` + `ApiHeader` + `ApiUnauthorizedResponse`; handlers read the id with `@CurrentUserId()`. Public routes (post list, single post, search, comment list, followers count) have no guard; `GET /posts/:id` still reads `@CurrentUserId()` so an author can fetch their own draft.
- `PostService.findPost(id, requesterId?)` returns 404 for another author's draft; `PostService.findPublishedPost(id)` is the shared gate used by likes, comments and reposts. `CommentService` and `LikeService` inject `PostService` (their modules import `PostModule`).
- Tag rules (§ "Теги к публикациям") live in `post.constant.ts`: `MAX_TAGS_COUNT`, `TAG_PATTERN` (`/^\p{L}[^\s]{2,9}$/u`), `TAG_VALIDATION_MESSAGE`, applied with `@Matches(..., { each: true })` in all create DTOs and `UpdatePostDto`. Lowercasing and dedup stay in `PostService.normalizeTags`.
- `UpdatePostDto` validates every optional field and adds `publishedAt` (§2.11, `@Type(() => Date) @IsDate()`) and `status` (§2.12). `PostService.updatePost` merges only defined entries, because compiled DTOs carry `undefined` own properties.
- `PostRepository.findByTitle` ORs `contains` over individual words, so a multi-word query matches on any word (§8.2).
- `apps/blog/blog.http` has REST Client smoke examples, including negative cases (401 without the header, 403 on someone else's post, 409 self-repost, 400 bad tags).

## Notify Service
- Prisma schema: `apps/notify/prisma/schema.prisma` (tables `email_subscribers`, `notify_posts`).
- Runtime Prisma wrapper: `apps/notify/src/app/prisma/`.
- Hybrid app (`main.ts`): HTTP server plus a RabbitMQ microservice (`Transport.RMQ`, `noAck: true`) bound to the queue `RABBITMQ_QUEUE` (default `readme.notify.income`).
- Consumers (`@EventPattern`): `add.subscriber` upserts `email_subscribers`; `add.post` upserts `notify_posts`. Routing keys are the shared `RabbitRouting` enum in `@project/shared-types`. `blog` is the `add.post` producer (see its `notify-client/` feature); `users` does not yet publish `add.subscriber`.
- The only synchronous endpoint is `POST /api/newsletters`: emails every subscriber a digest of posts where `notifiedAt IS NULL`, then marks them notified ("publications since the last newsletter", §7.3/§7.5).
- Mail: `@nestjs-modules/mailer` (+ `nodemailer`) sends to Mailpit; the HTML digest is built in `mail.service.ts`.
- Internal event payloads are trusted (the global `ValidationPipe`/`DomainExceptionFilter` are not inherited by the consumer); `publishedAt` is coerced to `Date` in the repository.
- Seed: `apps/notify/prisma/seed.ts`; `npx nx db-fill notify` creates 3 demo subscribers (matching the Users demo emails).
- Manual test publisher (no `users`/`blog` needed): `tsx apps/notify/tools/rabbit-publish.ts`. REST Client smoke in `apps/notify/notify.http`.
- In WebStorm Database panel connect to `localhost:5435`, database `readme-notify`, schema `public`.

## File-Storage Service
- Prisma schema: `apps/file-storage/prisma/schema.prisma` (table `files`).
- Runtime Prisma wrapper: `apps/file-storage/src/app/prisma/`.
- Stores file metadata in Postgres (`files` table, UUID PK) and binaries on the filesystem under `UPLOAD_DIRECTORY_PATH` (default `apps/file-storage/uploads`, resolved against `process.cwd()` so `nx serve` from `project/` works).
- Upload endpoints: `POST /api/files/avatar` (≤ 500 КБ) and `POST /api/files/photo` (≤ 1 МБ). Both jpeg/png only, validated by magic bytes via `FileTypeValidator` (Nest 11 default uses `file-type@21.3.4` on `file.buffer`; multer memory storage — do not switch to disk storage). `MaxFileSizeValidator` runs first, `FileTypeValidator` second.
- `GET /api/files/:fileId` returns the metadata RDO (`FileRdo`) plus a ready absolute `url`. `FileIdParamDto` validates with `@IsUUID('4')` to avoid Prisma P2023 on non-uuid input.
- Statics served through `app.useStaticAssets` (`NestExpressApplication`) under the prefix `STATIC_SERVE_ROOT` (default `/static`), outside the `api` global prefix. No `@nestjs/serve-static` dependency.
- `FileService` detects mimetype from the buffer's magic bytes (not from `file.mimetype`), builds a posix `subDirectory` `<kind>/<YYYY>/<MM>` (only `/`, used for both DB and URL), writes the file via `node:fs/promises`, and on a DB failure best-effort `unlink`s the orphan and rethrows. The `url` is built by the service (`${baseUrl}${serveRoot}/${path}`), not the controller.
- `StorageConfig` (`registerAs` `storage`) holds `uploadDirectory`, `serveRoot`, `baseUrl`; `env.validation.ts` uses `@IsUrl({ require_tld: false })` for `STATIC_BASE_URL` so `http://localhost:3004` validates.
- Magic numbers: app `3004`, Postgres `5436`, pgAdmin `8085`.
- No seed (no `db-fill` target). Sample fixtures in `apps/file-storage/sample/`; REST Client smoke in `apps/file-storage/file-storage.http`.
- In WebStorm Database panel connect to `localhost:5436`, database `readme-file-storage`, schema `public`, table `files`.

## API Gateway Service
- No Prisma, no compose, no DB — stateless presentation layer (port `3005`).
- `apps/api-gateway/.env` must have `JWT_ACCESS_TOKEN_SECRET` byte-identical to `apps/users/.env` (gateway verifies JWT locally with `@nestjs/jwt`; users has no `/check` endpoint).
- `HttpModule.registerAsync` injects `servicesConfig` for the 4 downstream URLs + `HTTP_CLIENT_TIMEOUT`. `ClientsModule` exports 4 clients (`UsersClient`, `BlogClient`, `FileStorageClient`, `NotifyClient`) and `HttpModule` (so `HttpService` is available to the clients via DI); each feature module imports `ClientsModule`.
- `JwtAuthGuard` extracts Bearer token → `jwtService.verifyAsync<TokenPayload>(token, { secret })` → `request.user`. Errors throw domain `TokenNotProvidedError`/`InvalidTokenError` (→ 401 via `DomainExceptionFilter`).
- `@CurrentUser('sub')` decorator returns the user id from the JWT payload.
- `@Catch(AxiosError)` filter (`AxiosExceptionFilter`) passes through downstream `response.status` + `response.data` as-is; no response (network error) → 503. Registered in `main.ts` alongside `DomainExceptionFilter`.
- Author enrichment: `UsersClient.getUserInfoMap(ids)` dedupes `authorId`s, calls `GET users /auth/:id` in parallel; non-UUID ids (e.g. `stub-user-id`) and errors → `null`. Nested RDOs (`PostWithAuthorRdo.author`, `CommentWithAuthorRdo.author`, `SubscriptionWithUserRdo.user`) use `@Type(() => UserInfoRdo)` + `@Expose` so `fillRdo` with `excludeExtraneousValues` doesn't return empty.
- Multipart pass-through: `POST /api/auth/register` (`FileInterceptor('avatar')`, `ParseFilePipe` with `fileIsRequired: false`) uploads to file-storage `/files/avatar`, then calls users `/auth/register` with `avatarUrl`. `POST /api/posts/photo` (`FileInterceptor('photo')`) uploads to file-storage `/files/photo`, then calls blog `/posts/photo` with `photoUrl`. Upload limits and `IMAGE_MIME_TYPE_PATTERN` are duplicated locally in `common/upload.constant.ts` (cross-app imports forbidden).
- Gateway create-DTOs are copies of blog DTOs without the `type` field (the service adds `type: PostType.X` before calling blog). `UpdatePostDto` is all-optional with `require_tld: false` on `photoUrl`/`link`.
- `GET /api/users/:id` aggregates: `Promise.all([users getUser, blog getPosts(authorId, limit=1), blog getFollowersCount])` → `postsCount = totalItems`, `subscribersCount = count`.
- `JwtModule.register({ global: true })` (bare pattern — secret passed in `verifyAsync`, not in module config, same as `users`).
- Swagger `DocumentBuilder` «Readme — API Gateway» + `.addBearerAuth()` on `/spec`. `@ApiBearerAuth()` on all protected routes.
- `BlogClient.withUser(userId)` attaches the `X-User-Id` header to every user-scoped blog call (create/update/delete/repost, comments, likes, subscriptions, feed, drafts); controllers take `@CurrentUser('sub')` and thread it through the services. Public calls (post list, search, followers count) send no header.
- `AnonymousGuard` (`common/anonymous.guard.ts`) protects `POST /api/auth/register`: a valid Bearer token → `AlreadyAuthenticatedError` (403, §1.1). A missing or invalid token is treated as anonymous.
- Tag constants are duplicated in `posts/posts.constant.ts` (cross-app imports are forbidden, same reasoning as `common/upload.constant.ts`). The gateway `UpdatePostDto` also carries `publishedAt` (`@IsDateString()`) and `status`.
- `POST /api/auth/refresh` proxies to users' refresh endpoint (`UsersClient.refresh`).
- `OptionalJwtAuthGuard` (`common/optional-jwt-auth.guard.ts`) is used on `GET /api/posts/:id`: the route stays public, but a valid token fills `request.user`, so an author can open their own draft by direct id.
- No separate `/api/files/*` in the gateway. Personal messages (messages.html), viewsCount, likedByMe — out of scope.
- REST Client smoke in `apps/api-gateway/api-gateway.http`.

## HTTP Smoke Files (`*.http`)
- These are **IntelliJ HTTP Client** files (WebStorm/IDEA), not VS Code REST Client. The two dialects differ and are not interchangeable.
- Chaining a value out of a response uses a response handler, never `{{requestName.response.body.field}}` (that is REST Client syntax; the IntelliJ client parses `requestName` as a plain variable and the inspection reports `Cannot resolve variable`):
  ```
  # @name createPost
  POST {{host}}/posts/text
  ...

  > {%
      client.global.set('postId', response.body.id);
  %}
  ```
  Later requests then use `{{postId}}`. The `HttpClientUnresolvedVariable` inspection recognizes names declared via `client.global.set`, so they are not flagged.
- Each app with a `.http` file ships `http-client.env.json` defining a `development` environment. WebStorm stores the selected environment per file in `.idea/workspace.xml` (`HttpClientSelectedEnvironments`), which is **not** committed — if the selected environment does not exist, every variable in the file is reported as `Cannot resolve variable 'x' in the selected environment 'development'`, including in-place ones.
- In-place `@name = value` declarations **take precedence over environment values** (verified with `jetbrains/intellij-http-client`). Static values are therefore duplicated: in-place so the file works with no environment selected, and in the env file so an existing selection resolves. Keep the two in sync.
- Verify a `.http` file without the IDE:
  ```
  docker run --rm -v "$PWD:/workdir" jetbrains/intellij-http-client -D --no-progress \
    -e development -v /workdir/apps/blog/http-client.env.json /workdir/apps/blog/blog.http
  ```
  `-D` maps `localhost` to `host.docker.internal`. Requires the services to be running.

## Known Gaps
- Personal messages (messages.html), viewsCount and likedByMe from the markup are out of scope — the specification does not require them.
- No refresh-token rotation or revocation list: `POST /auth/refresh` only validates the signature and issues a new pair.

## Gotchas
- Numeric env vars need explicit `: number` types in `EnvironmentVariables`, otherwise SWC decorator metadata may not convert strings correctly.
- Post create DTO `type` fields must have validators like `@Equals(PostType.X)`, otherwise `ValidationPipe({ whitelist: true })` strips them.
- Local Postgres on `5432` can conflict with Docker. `blog` uses host port `5433`; `users` `5434`; `notify` `5435`; `file-storage` app `3004`, Postgres `5436`, pgAdmin `8085`. `notify` also exposes RabbitMQ `5672`/`15672`, Mailpit `1025`/`8025`, and pgAdmin `8084`. `api-gateway` app `3005` (stateless, no DB/compose).
- pgAdmin rejects reserved domains like `admin@readme.local`; use `admin@readme.com`.
- `@IsUrl()` defaults reject `http://localhost:...` URLs — needs `require_tld: false`. Fixed in: `file-storage` (`STATIC_BASE_URL`), `users` (`avatarUrl` in `CreateUserDto`), `blog` (`photoUrl` in `CreatePhotoPostDto`), and `api-gateway` (all `*_SERVICE_URL` env vars; `UpdatePostDto` `photoUrl`/`link` fields).
- `FileTypeValidator` (Nest 11) validates by magic bytes via `file-type@21.3.4` on `file.buffer`; needs multer memory storage (the default — do not switch to disk storage). The regex matches the *detected* mime (`image/jpeg`, not `image/jpg`).
- `apps/<app>/tsconfig.app.json` intentionally includes `prisma.config.ts` and `prisma/**/*.ts` so `import.meta` in Prisma scripts compiles.
- `.env` files are local and ignored by git. Copy the per-app `.env.example` (`cp apps/<app>/.env.example apps/<app>/.env`). Root-level launch instructions live in `specification.md`.
- Builds compile with tsc at `target: es2023`, so `useDefineForClassFields` makes declared-but-unset DTO fields exist as own `undefined` properties. Filter them before `Object.assign`-ing a DTO onto a domain object (see `PostService.updatePost`).
- Old local Mongo data may still exist under ignored `apps/users/mongodb/`; it is no longer used.

## Local Infra
- Users Postgres: `docker compose -f apps/users/compose.yaml up -d`
- Users DB: `localhost:5434`, database `readme-users`, user `admin`, password `test`
- Users pgAdmin: `http://localhost:8083`, login `admin@readme.com`, password `test`
- Blog Postgres: `docker compose -f apps/blog/compose.yaml up -d`
- Blog DB: `localhost:5433`, database `readme-blog`, user `admin`, password `test`
- Blog pgAdmin: `http://localhost:8082`
- Notify infra: `docker compose -f apps/notify/compose.yaml up -d`
- Notify RabbitMQ: AMQP `localhost:5672`, management UI `http://localhost:15672`, login `admin` / `test`
- Notify DB: `localhost:5435`, database `readme-notify`, user `admin`, password `test`
- Notify pgAdmin: `http://localhost:8084`
- Notify Mailpit: SMTP `localhost:1025`, web UI `http://localhost:8025`
- File-storage Postgres: `docker compose -f apps/file-storage/compose.yaml up -d`
- File-storage DB: `localhost:5436`, database `readme-file-storage`, user `admin`, password `test`
- File-storage pgAdmin: `http://localhost:8085`
- API Gateway: **no compose** — stateless. App `http://localhost:3005/api`, Swagger `http://localhost:3005/spec`. Requires all 4 downstream services running.
- If containers were renamed from older Mongo setup, use `docker compose -f apps/users/compose.yaml up -d --remove-orphans`.
- If Postgres ignores changed credentials, the data dir was already initialized. Stop compose, remove `apps/<app>/postgres`, then start again.

## Local Env Examples
Users `.env`:

```env
APPLICATION_NODE_ENV=development
APPLICATION_PORT=3001

POSTGRES_HOST=localhost
POSTGRES_PORT=5434
POSTGRES_USER=admin
POSTGRES_PASSWORD=test
POSTGRES_DB=readme-users

PGADMIN_DEFAULT_EMAIL=admin@readme.com
PGADMIN_DEFAULT_PASSWORD=test
PGADMIN_PORT=8083

JWT_ACCESS_TOKEN_SECRET=users-dev-access-token-secret-change-me
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_SECRET=users-dev-refresh-token-secret-change-me
JWT_REFRESH_TOKEN_EXPIRES_IN=7d

# RabbitMQ producer for add.subscriber — connects to notify's broker
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=test
RABBITMQ_QUEUE=readme.notify.income
```

Blog `.env`:

```env
APPLICATION_NODE_ENV=development
APPLICATION_PORT=3002

POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_USER=admin
POSTGRES_PASSWORD=test
POSTGRES_DB=readme-blog

# RabbitMQ producer — connects to notify's broker (apps/notify/compose.yaml)
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=test
RABBITMQ_QUEUE=readme.notify.income

PGADMIN_DEFAULT_EMAIL=admin@readme.com
PGADMIN_DEFAULT_PASSWORD=test
PGADMIN_PORT=8082
```

Notify `.env`:

```env
APPLICATION_NODE_ENV=development
APPLICATION_PORT=3003

RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_MANAGEMENT_PORT=15672
RABBITMQ_DEFAULT_USER=admin
RABBITMQ_DEFAULT_PASS=test
RABBITMQ_DEFAULT_VHOST=/

RABBITMQ_USER=admin
RABBITMQ_PASSWORD=test
RABBITMQ_QUEUE=readme.notify.income

POSTGRES_HOST=localhost
POSTGRES_PORT=5435
POSTGRES_USER=admin
POSTGRES_PASSWORD=test
POSTGRES_DB=readme-notify

PGADMIN_DEFAULT_EMAIL=admin@readme.com
PGADMIN_DEFAULT_PASSWORD=test
PGADMIN_PORT=8084

MAIL_SMTP_HOST=localhost
MAIL_SMTP_PORT=1025
MAIL_UI_PORT=8025
MAIL_FROM=no-reply@readme.local
```

File-storage `.env`:

```env
APPLICATION_NODE_ENV=development
APPLICATION_PORT=3004

POSTGRES_HOST=localhost
POSTGRES_PORT=5436
POSTGRES_USER=admin
POSTGRES_PASSWORD=test
POSTGRES_DB=readme-file-storage

PGADMIN_DEFAULT_EMAIL=admin@readme.com
PGADMIN_DEFAULT_PASSWORD=test
PGADMIN_PORT=8085

UPLOAD_DIRECTORY_PATH=apps/file-storage/uploads
STATIC_SERVE_ROOT=/static
STATIC_BASE_URL=http://localhost:3004
```

API Gateway `.env` (stateless — no DB/compose; `JWT_ACCESS_TOKEN_SECRET` must match `apps/users/.env` byte-for-byte):

```env
APPLICATION_NODE_ENV=development
APPLICATION_PORT=3005

JWT_ACCESS_TOKEN_SECRET=users-dev-access-token-secret-change-me

USERS_SERVICE_URL=http://localhost:3001/api
BLOG_SERVICE_URL=http://localhost:3002/api
FILE_STORAGE_SERVICE_URL=http://localhost:3004/api
NOTIFY_SERVICE_URL=http://localhost:3003/api
HTTP_CLIENT_TIMEOUT=5000
```

## Git
- Branch per course task, for example `moduleN-taskM`.
- Check current branch with `git branch --show-current`.
- Do not commit to `master`.
