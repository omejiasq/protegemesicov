import {
    IsBoolean,
    IsMongoId,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsIn,
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

    // Campos de dispositivo simplificados
    @IsOptional()
    @IsString()
    imei?: string;

    @IsOptional()
    @IsString()
    serial?: string;

    @IsOptional()
    @IsString()
    @IsIn(['vehiculo', 'alcoholimetro_moto', 'alcoholimetro_carro', 'smartphone', 'dispositivo_distracciones', 'gps_tradicional', 'otro'])
    device_type?: string;

    @IsOptional()
    @IsBoolean()
    estado?: boolean;
  }
  