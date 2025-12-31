import {
    IsBoolean,
    IsMongoId,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
  } from 'class-validator';
  
  export class CreateVehicleDto {
    @IsString()
    @IsNotEmpty()
    placa!: string;
  
    @IsNumber()
    clase!: number;
  
    @IsNumber()
    nivelServicio!: number;
  
    @IsOptional()
    @IsString()
    soat?: string;
  
    @IsOptional()
    fechaVencimientoSoat?: Date | string;
  
    @IsOptional()
    @IsString()
    revisionTecnicoMecanica?: string;
  
    @IsOptional()
    fechaRevisionTecnicoMecanica?: Date | string;
  
    @IsOptional()
    @IsString()
    idPolizas?: string;
  
    @IsOptional()
    @IsString()
    tipoPoliza?: string;
  
    @IsOptional()
    vigencia?: Date | string;
  
    @IsOptional()
    @IsString()
    tarjetaOperacion?: string;
  
    @IsOptional()
    fechaTarjetaOperacion?: Date | string;
  
    @IsOptional()
    @IsMongoId()
    driver_id?: string;
  
    @IsOptional()
    @IsBoolean()
    estado?: boolean;
  }
  