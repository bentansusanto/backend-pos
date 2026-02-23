import { Test, TestingModule } from '@nestjs/testing';
import { successOrderMessage } from 'src/libs/success/success_order';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockOrder = {
    id: 'order-id',
    customer_id: 'customer-id',
    branch_id: 'branch-id',
    user_id: 'user-id',
    items: [],
    invoice_number: 'INV-123',
    subtotal: 100,
    tax_amount: 10,
    total_amount: 110,
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockOrdersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateQuantity: jest.fn(),
    deleteOrderItems: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an order', async () => {
      const createOrderDto = {
        items: [],
        branch_id: 'branch-id',
      } as any;
      const mockUser = { id: 'user-id' };

      jest.spyOn(service, 'create').mockResolvedValue({
        message: successOrderMessage.SUCCESS_CREATE_ORDER,
        data: mockOrder,
      });

      const result = await controller.create(mockUser as any, createOrderDto);

      expect(result.message).toEqual(successOrderMessage.SUCCESS_CREATE_ORDER);
      expect(result.data).toEqual(mockOrder);
      expect(service.create).toHaveBeenCalledWith(createOrderDto, mockUser.id);
    });
  });

  describe('findAll', () => {
    it('should return all orders', async () => {
      const mockUser = { id: 'user-id' };
      jest.spyOn(service, 'findAll').mockResolvedValue({
        message: successOrderMessage.SUCCESS_GET_ORDERS,
        datas: [mockOrder],
      });

      const result = await controller.findAll(mockUser as any);

      expect(result.message).toEqual(successOrderMessage.SUCCESS_GET_ORDERS);
      expect(result.data).toEqual([mockOrder]);
    });
  });

  describe('findOne', () => {
    it('should return an order by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        message: successOrderMessage.SUCCESS_GET_ORDER,
        data: mockOrder,
      });

      const result = await controller.findOne('order-id');

      expect(result.message).toEqual(successOrderMessage.SUCCESS_GET_ORDER);
      expect(result.data).toEqual(mockOrder);
    });
  });

  describe('update', () => {
    it('should update an order', async () => {
      const updateOrderDto = { notes: 'Updated Note' };

      jest.spyOn(service, 'update').mockResolvedValue({
        message: successOrderMessage.SUCCESS_UPDATE_ORDER,
        data: mockOrder,
      });

      const result = await controller.update('order-id', updateOrderDto);

      expect(result.message).toEqual(successOrderMessage.SUCCESS_UPDATE_ORDER);
      expect(result.data).toEqual(mockOrder);
      expect(service.update).toHaveBeenCalledWith('order-id', updateOrderDto);
    });
  });

  describe('updateQuantity', () => {
    it('should update order item quantity', async () => {
      jest.spyOn(service, 'updateQuantity').mockResolvedValue({
        message: successOrderMessage.SUCCESS_UPDATE_ORDER_QUANTITY,
        data: mockOrder,
      });

      const result = await controller.updateQuantity('order-id', 'item-id', 5);

      expect(result.message).toEqual(
        successOrderMessage.SUCCESS_UPDATE_ORDER_QUANTITY,
      );
      expect(result.data).toEqual(mockOrder);
      expect(service.updateQuantity).toHaveBeenCalledWith(
        'order-id',
        'item-id',
        5,
      );
    });
  });

  describe('deleteOrderItems', () => {
    it('should delete an order item', async () => {
      jest.spyOn(service, 'deleteOrderItems').mockResolvedValue({
        message: successOrderMessage.SUCCESS_DELETE_ORDER_ITEMS,
        data: mockOrder,
      });

      const result = await controller.deleteOrderItems('order-id', 'item-id');

      expect(result.message).toEqual(
        successOrderMessage.SUCCESS_DELETE_ORDER_ITEMS,
      );
      expect(result.data).toEqual(mockOrder);
      expect(service.deleteOrderItems).toHaveBeenCalledWith(
        'order-id',
        'item-id',
      );
    });
  });

  describe('remove', () => {
    it('should remove an order', async () => {
      const expectedMessage = 'This action removes a #order-id order';
      jest.spyOn(service, 'remove').mockReturnValue(expectedMessage);

      const result = await controller.remove('order-id');

      expect(result).toEqual(expectedMessage);
    });
  });
});
