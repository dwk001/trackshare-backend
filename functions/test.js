export default {
  async fetch(request, env, ctx) {
    return new Response('Hello from TrackShare Function!', {
      headers: { 'Content-Type': 'text/plain' }
    });
  },
};



