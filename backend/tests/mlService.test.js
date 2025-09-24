const { expect } = require('chai');
const sinon = require('sinon');
const mlService = require('../services/mlService');

describe('ML Service', function() {
  let dbStub;
  
  beforeEach(function() {
    // Stub database operations
    dbStub = {
      run: sinon.stub().resolves(),
      get: sinon.stub().resolves(),
      all: sinon.stub().resolves([])
    };
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('getSupportedAlgorithms', function() {
    it('should return list of supported algorithms', async function() {
      const result = await mlService.getSupportedAlgorithms();
      
      expect(result).to.have.property('algorithms');
      expect(result).to.have.property('basicCount');
      expect(result).to.have.property('advancedCount');
      expect(result).to.have.property('totalImplemented');
      expect(result.algorithms).to.be.an('array');
    });

    it('should include both basic and advanced algorithms', async function() {
      const result = await mlService.getSupportedAlgorithms();
      
      const basicAlgorithms = result.algorithms.filter(alg => alg.category === 'basic');
      const advancedAlgorithms = result.algorithms.filter(alg => alg.category === 'advanced');
      
      expect(basicAlgorithms.length).to.be.greaterThan(0);
      expect(advancedAlgorithms.length).to.be.greaterThan(0);
    });
  });

  describe('createAdvancedModel', function() {
    it('should throw error for missing required fields', async function() {
      try {
        await mlService.createAdvancedModel({}, 'user123');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Missing required fields');
      }
    });

    it('should throw error for unsupported algorithm', async function() {
      try {
        await mlService.createAdvancedModel({
          name: 'Test Model',
          algorithmType: 'unsupported_algorithm'
        }, 'user123');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Unsupported algorithm');
      }
    });

    it('should create model with valid data', async function() {
      // Mock the advanced ML service
      const mockResult = { success: true, modelData: { trained: false } };
      sinon.stub(mlService.advancedMLService, 'createAdvancedModel').resolves(mockResult);
      
      const modelData = {
        name: 'Test Model',
        algorithmType: 'lstm',
        symbols: ['bitcoin'],
        parameters: { epochs: 100 }
      };

      const result = await mlService.createAdvancedModel(modelData, 'user123');
      
      expect(result).to.have.property('modelId');
      expect(result).to.have.property('status', 'created');
      expect(result).to.have.property('message');
    });
  });

  describe('getUserModels', function() {
    it('should return empty array for user with no models', async function() {
      const models = await mlService.getUserModels('user123');
      expect(models).to.be.an('array');
      expect(models).to.have.length(0);
    });

    it('should return formatted models for user', async function() {
      const mockModels = [{
        id: 'model1',
        name: 'Test Model',
        algorithm_type: 'lstm',
        symbols: '["bitcoin"]',
        status: 'trained',
        created_at: '2025-09-16T00:00:00Z',
        updated_at: '2025-09-16T01:00:00Z'
      }];
      
      dbStub.all.resolves(mockModels);
      sinon.stub(require('../database/init'), 'db').value(dbStub);
      
      const models = await mlService.getUserModels('user123');
      
      expect(models).to.have.length(1);
      expect(models[0]).to.have.property('symbols');
      expect(models[0].symbols).to.be.an('array');
      expect(models[0]).to.have.property('createdAt');
      expect(models[0]).to.have.property('updatedAt');
    });
  });

  describe('error handling', function() {
    it('should handle database errors gracefully', async function() {
      dbStub.all.rejects(new Error('Database connection failed'));
      sinon.stub(require('../database/init'), 'db').value(dbStub);
      
      try {
        await mlService.getUserModels('user123');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Database connection failed');
      }
    });
  });
});