import { AvailableServicesDTO } from '@core/sellmatchdb/dto';
import { EFeeType } from '../steps/step-honoraires/EFeeType';

export interface ServicesByCategory {
  category: string;
  categoryLabel: string;
  services: AvailableServicesDTO[];
}

export interface CandidatureFormData {
  presentation: string;
  estimatedTimeline: string;
  feeType: EFeeType;
  feePercentage: number | undefined;
  feeFixedAmount: number | undefined;
  message: string;
}

