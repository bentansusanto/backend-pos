# Summary of Entities Created

This document provides a summary of the database entities (tables) created in the recent modules.

## Promotions Module
| Entity Name | Table Name | Description | Key Fields |
|-------------|------------|-------------|------------|
| **Promotion** | `promotions` | Core promotion data (name, validity, status). | `id`, `name`, `status`, `startDate`, `endDate`, `priority`, `isStackable` |
| **PromotionRule** | `promotion_rules` | Rules governing when a promotion applies and what it does. | `id`, `conditionType`, `conditionValue`, `actionType`, `actionValue` |
| **PromotionBranch** | `promotion_branches` | Linking promotions to specific branches and restricting by variants/categories. | `id`, `promotion_id`, `branch_id` |

### Promotion Rule Details
- **Condition types**: `MIN_PURCHASE_AMOUNT`, `QTY_STEP`, `SPECIFIC_ITEM`, `ITEM_QTY`.
- **Action types**: `PERCENTAGE_DISCOUNT`, `FIXED_DISCOUNT`, `FREE_GIFT`, `SET_TOTAL_PRICE`.

---

## Payments & Orders Module
| Entity Name | Table Name | Description | Key Fields |
|-------------|------------|-------------|------------|
| **Refund** | `refunds` | Records of refunded orders and payments. | `id`, `orderId`, `paymentId`, `amount`, `reason`, `refundedBy` |

---

## AI Insight Module
| Entity Name | Table Name | Description | Key Fields |
|-------------|------------|-------------|------------|
| **AiInsight** | `ai_insights` | AI-generated business insights for specific branches. | `id`, `branch_id`, `type`, `summary`, `metadata` |
