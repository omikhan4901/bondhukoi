export const authenticate = async (fastify, request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or missing token',
    });
  }
};

export const requireAuth = async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or missing token',
    });
  }
};
