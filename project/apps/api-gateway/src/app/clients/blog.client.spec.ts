import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { PostType, USER_ID_HEADER } from '@project/shared-types';
import { BlogClient } from './blog.client';

const USER_ID = '2f4b7d3a-3c1b-4c4d-8b6a-8ef7b92f1011';
const POST_ID = 'a1d2c3b4-5e6f-47a8-9b0c-1d2e3f4a5b6c';
const BLOG_URL = 'http://localhost:3002/api';

const SERVICES_CONFIG = {
  usersServiceUrl: 'http://localhost:3001/api',
  blogServiceUrl: BLOG_URL,
  fileStorageServiceUrl: 'http://localhost:3004/api',
  notifyServiceUrl: 'http://localhost:3003/api',
  httpTimeout: 5000,
};

describe('BlogClient', () => {
  let client: BlogClient;
  let httpService: {
    get: jest.Mock;
    post: jest.Mock;
    patch: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(() => {
    httpService = {
      get: jest.fn().mockReturnValue(of({ data: {} })),
      post: jest.fn().mockReturnValue(of({ data: {} })),
      patch: jest.fn().mockReturnValue(of({ data: {} })),
      delete: jest.fn().mockReturnValue(of({ data: undefined })),
    };
    client = new BlogClient(
      httpService as unknown as HttpService,
      SERVICES_CONFIG,
    );
  });

  it('sends the user id header when creating a post', async () => {
    await client.createPost(USER_ID, PostType.Text, { title: 'a' });

    expect(httpService.post).toHaveBeenCalledWith(
      `${BLOG_URL}/posts/text`,
      { title: 'a' },
      { headers: { [USER_ID_HEADER]: USER_ID } },
    );
  });

  it('sends the user id header together with query params for the feed', async () => {
    await client.getFeed(USER_ID, { limit: 25, page: 1 });

    expect(httpService.get).toHaveBeenCalledWith(`${BLOG_URL}/posts/feed`, {
      headers: { [USER_ID_HEADER]: USER_ID },
      params: { limit: 25, page: 1 },
    });
  });

  it('sends the user id header when deleting a post', async () => {
    await client.deletePost(USER_ID, POST_ID);

    expect(httpService.delete).toHaveBeenCalledWith(
      `${BLOG_URL}/posts/${POST_ID}`,
      { headers: { [USER_ID_HEADER]: USER_ID } },
    );
  });

  it('sends the user id header when liking a post', async () => {
    await client.addLike(USER_ID, POST_ID);

    expect(httpService.post).toHaveBeenCalledWith(
      `${BLOG_URL}/posts/${POST_ID}/likes`,
      undefined,
      { headers: { [USER_ID_HEADER]: USER_ID } },
    );
  });

  it('omits the header for an anonymous post lookup', async () => {
    await client.getPost(POST_ID);

    expect(httpService.get).toHaveBeenCalledWith(
      `${BLOG_URL}/posts/${POST_ID}`,
      undefined,
    );
  });

  it('keeps the public post list free of user params', async () => {
    await client.getPosts({ limit: 25 });

    expect(httpService.get).toHaveBeenCalledWith(`${BLOG_URL}/posts`, {
      params: { limit: 25 },
    });
  });
});
