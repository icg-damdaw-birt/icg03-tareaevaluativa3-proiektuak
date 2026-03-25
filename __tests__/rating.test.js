/**
 * TESTS DE RATING
 *
 * Testea el endpoint PATCH /api/movies/:id/rating
 * que añade un rating a las películas.
 */

const request = require('supertest');

// ============================================
// CONFIGURACIÓN DE MOCKS
// ============================================
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  movie: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.mock('../lib/prisma', () => mockPrisma);

jest.mock('../middleware/authMiddleware', () => {
  return (req, res, next) => {
    req.user = { userId: 'user-123' };
    next();
  };
});

const app = require('../server');
const prisma = require('../lib/prisma');

// ============================================
// SUITE DE TESTS: RATING
// ============================================
describe('API de Rating', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PATCH /api/movies/:id/rating', () => {

  it('debería añadir el rating a una película', async () => {
      // ARRANGE
      const peliculaMock = {
        id: 'movie-1',
        title: 'Inception',
        director: 'Christopher Nolan',
        year: 2010,
        posterUrl: 'https://example.com/inception.jpg',
        ownerId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const peliculaActualizada = { ...peliculaMock, rating: 4 };

      prisma.movie.findFirst.mockResolvedValue(peliculaMock);
      prisma.movie.update.mockResolvedValue(peliculaActualizada);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .send({ rating: 4 })
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.rating).toBe(4);
      expect(prisma.movie.findFirst).toHaveBeenCalledWith({
        where: { id: 'movie-1', ownerId: 'user-123' },
      });
      expect(prisma.movie.update).toHaveBeenCalledWith({
        where: { id: 'movie-1' },
        data: { rating: 4 },
      });
    });

    it('debería devolver 400 si el rating es superior a 5', async () => {
      // ARRANGE
      const ratingNoValido = { rating: 6 };

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .send(ratingNoValido)
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('El rating debe ser un número entre 0 y 5');
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
      expect(prisma.movie.update).not.toHaveBeenCalled();
    });

    it('debería devolver 400 si el rating es negativo', async () => {
      // ARRANGE
      const ratingNoValido = { rating: -1 };

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .send(ratingNoValido)
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('El rating debe ser un número entre 0 y 5');
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
      expect(prisma.movie.update).not.toHaveBeenCalled();
    });

    it('debería devolver 404 si la película no existe', async () => {
      // ARRANGE
      prisma.movie.findFirst.mockResolvedValue(null);

      // ACT
      const response = await request(app)
        .patch('/api/movies/no-existe/rating')
        .send({ rating: 4 })
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Película no encontrada');
      expect(prisma.movie.update).not.toHaveBeenCalled();
    });

    it('debería devolver 404 si la película pertenece a otro usuario', async () => {
      // ARRANGE
      prisma.movie.findFirst.mockResolvedValue(null);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-otro-user/rating')
        .send({ rating: 4 })
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Película no encontrada');
    });

    it('debería devolver 500 si ocurre un error en el servidor', async () => {
      // ARRANGE
      prisma.movie.findFirst.mockRejectedValue(new Error('DB connection error'));

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .send({ rating: 4 })
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error al actualizar rating');
    });
  });
});