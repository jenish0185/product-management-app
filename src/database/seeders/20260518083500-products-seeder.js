'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('products', [
      {
        name: 'Wireless Headphones',
        description: 'Premium noise-cancelling wireless headphones with 30hr battery life.',
        price: 149.99,
        stock: 50,
        category: 'Electronics',
        imageUrl: 'https://example.com/headphones.jpg',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Mechanical Keyboard',
        description: 'Compact TKL mechanical keyboard with RGB backlight and brown switches.',
        price: 89.99,
        stock: 30,
        category: 'Electronics',
        imageUrl: 'https://example.com/keyboard.jpg',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Ergonomic Office Chair',
        description: 'Fully adjustable ergonomic chair with lumbar support for long working sessions.',
        price: 299.99,
        stock: 15,
        category: 'Furniture',
        imageUrl: 'https://example.com/chair.jpg',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Stainless Steel Water Bottle',
        description: 'Insulated water bottle that keeps drinks cold for 24 hours and hot for 12 hours.',
        price: 24.99,
        stock: 200,
        category: 'Kitchen',
        imageUrl: 'https://example.com/bottle.jpg',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Running Shoes',
        description: 'Lightweight breathable running shoes with memory foam insoles.',
        price: 79.99,
        stock: 75,
        category: 'Sports',
        imageUrl: 'https://example.com/shoes.jpg',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('products', null, {});
  },
};
