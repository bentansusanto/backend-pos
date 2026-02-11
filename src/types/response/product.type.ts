import { ResponseModel } from './index.type';

export class ProductData {
  id: string;
  name_product: string;
  category_id: string;
  price: number;
  description: string;
  slug: string;
  thumbnail: string;
  images: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class CategoryData {
  id: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ProductVariantData {
  id: string;
  product_id: string;
  sku: string;
  weight: number;
  color: string;
  name_variant: string;
  price: number;
  thumbnail: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ProductResponse extends ResponseModel<ProductData> {
  message: string;
  data?: ProductData;
  datas?: ProductData[];
}

export class CategoryResponse extends ResponseModel<CategoryData> {
  message: string;
  data?: CategoryData;
  datas?: CategoryData[];
}

export class ProductVariantResponse extends ResponseModel<ProductVariantData> {
  message: string;
  data?: ProductVariantData;
  datas?: ProductVariantData[];
}
