import { ResponseModel } from './index.type';
import {
  PromotionActionType,
  PromotionConditionType,
  PromotionStatus,
} from '../../modules/promotions/enums/promotion.enum';

export class PromotionRuleData {
  id: string;
  conditionType: PromotionConditionType;
  conditionValue: any;
  conditionVariantIds?: string[];
  conditionCategoryIds?: string[];
  actionType: PromotionActionType;
  actionValue: any;
  actionVariantIds?: string[];
  actionCategoryIds?: string[];
}

export class PromotionData {
  id: string;
  name: string;
  description?: string;
  status: PromotionStatus;
  priority: number;
  isStackable: boolean;
  startDate: Date;
  endDate: Date;
  branchIds?: string[];
  rules: PromotionRuleData[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class PromotionResponse extends ResponseModel<PromotionData> {
  message: string;
  data?: PromotionData;
  datas?: PromotionData[];
}
