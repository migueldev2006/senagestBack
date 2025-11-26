import { PartialType } from '@nestjs/mapped-types';
import { CreatePsiculturaDto } from './create-psicultura.dto';

export class UpdatePsiculturaDto extends PartialType(CreatePsiculturaDto) {}
