type ApiService = { fetch(request: Request): Promise<Response> };

// Authentication callbacks redirect back to the web application. Following a
// relative redirect inside the API service would instead request the API root.
export function forwardToApiService(api: ApiService, request: Request): Promise<Response> {
  return api.fetch(new Request(request, { redirect: 'manual' }));
}
