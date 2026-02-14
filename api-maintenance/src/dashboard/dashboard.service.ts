import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  EnlistmentDetail,
  EnlistmentDetailDocument,
} from '../schema/enlistment-schema';

import {
  PreventiveDetail,
  PreventiveDetailDocument,
} from '../schema/preventive.schema';

import {
  CorrectiveDetail,
  CorrectiveDetailDocument,
} from '../schema/corrective.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(EnlistmentDetail.name)
    private enlistmentModel: Model<EnlistmentDetailDocument>,

    @InjectModel(PreventiveDetail.name)
    private preventiveModel: Model<PreventiveDetailDocument>,

    @InjectModel(CorrectiveDetail.name)
    private correctiveModel: Model<CorrectiveDetailDocument>,
  ) {}

  /** ===============================
   * CÓDIGOS OBLIGATORIOS ALISTAMIENTO
   =============================== */
  private readonly CODIGOS_ALISTAMIENTO = [
    1,2,3,4,5,6,7,8,9,10,11,
  ];

  /* =====================================================
     RANGO DE FECHAS (AÑO / AÑO + MES)
  ===================================================== */
  private rangoFecha(year: number, month?: number) {
    if (month) {
      const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
      const end   = new Date(Date.UTC(year, month, 1, 0, 0, 0));
      return { start, end };
    }
  
    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const end   = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));
    return { start, end };
  }

  /* =====================================================
     KPI SUPERIORES (CORREGIDO)
  ===================================================== */
  async kpisSuperiores(year: number, enterprise: string, month?: number) {
    const { start, end } = this.rangoFecha(year, month);
  
    // 🔥 Fecha de referencia del período consultado
    const fechaRef = month
      ? new Date(Date.UTC(year, month, 0, 23, 59, 59))
      : new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  
    const codigosAlistamiento = this.CODIGOS_ALISTAMIENTO;
  
    const [
      totalAlistamientos,
      alistamientosConFallaAgg,
      totalCorrectivos,
      preventivosVencidos,
    ] = await Promise.all([
      // =====================================================
      // TOTAL ALISTAMIENTOS
      // =====================================================
      this.enlistmentModel.countDocuments({
        enterprise_id: enterprise,
        createdAt: { $gte: start, $lt: end },
      }),
  
      // =====================================================
      // ALISTAMIENTOS CON FALLA REAL
      // =====================================================
      this.enlistmentModel.aggregate([
        {
          $match: {
            enterprise_id: enterprise,
            createdAt: { $gte: start, $lt: end },
          },
        },
        {
          $addFields: {
            actividadesInt: {
              $map: {
                input: '$actividades',
                as: 'a',
                in: { $toInt: '$$a' },
              },
            },
          },
        },
        {
          $match: {
            $expr: {
              $gt: [
                {
                  $size: {
                    $setDifference: [
                      codigosAlistamiento,
                      '$actividadesInt',
                    ],
                  },
                },
                0,
              ],
            },
          },
        },
        { $count: 'total' },
      ]),
  
      // =====================================================
      // TOTAL CORRECTIVOS
      // =====================================================
      this.correctiveModel.countDocuments({
        enterprise_id: enterprise,
        occurredAt: { $gte: start, $lt: end },
      }),
  
      // =====================================================
      // PREVENTIVOS VENCIDOS (SEGÚN PERÍODO CONSULTADO)
      // =====================================================
      this.preventiveModel.countDocuments({
        enterprise_id: enterprise,
        estado: true,
        executedAt: { $gte: start, $lt: end },
        dueDate: { $lt: fechaRef },
      }),
    ]);
  
    return {
      totalAlistamientos,
      alistamientosConFalla: alistamientosConFallaAgg[0]?.total || 0,
      correctivos: totalCorrectivos,
      preventivosVencidos,
    };
  }
  

  private fechaReferencia(year: number, month?: number) {
    if (month) {
      return new Date(Date.UTC(year, month, 0, 23, 59, 59));
    }
    return new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  }
  

  /* =====================================================
     PIE PREVENTIVOS
  ===================================================== */
  async piePreventivos(enterprise: string, year: number, month?: number) {
    const { start, end } = this.rangoFecha(year, month);
  
    const fechaRef = this.fechaReferencia(year, month);
    const sieteDiasAntes = new Date(fechaRef.getTime() - 7 * 86400000);
  
    const base = {
      enterprise_id: enterprise,
      estado: true,
      executedAt: { $gte: start, $lt: end }, // 🔥 importante
    };
  
    const [vigentes, proximos, vencidos] = await Promise.all([
      this.preventiveModel.countDocuments({
        ...base,
        dueDate: { $gt: fechaRef },
      }),
      this.preventiveModel.countDocuments({
        ...base,
        dueDate: { $gt: sieteDiasAntes, $lte: fechaRef },
      }),
      this.preventiveModel.countDocuments({
        ...base,
        dueDate: { $lte: sieteDiasAntes },
      }),
    ]);
  
    return [
      { label: 'Vigentes', value: vigentes, color: '#cfe8ff' },
      { label: 'Próximos', value: proximos, color: '#fff1b8' },
      { label: 'Vencidos', value: vencidos, color: '#ffd6d6' },
    ];
  }
  

  /* =====================================================
     TENDENCIA ALISTAMIENTOS
  ===================================================== */
  async trendEnlistamientos(year: number, enterprise: string, month?: number) {
    const { start, end } = this.rangoFecha(year, month);

    return this.enlistmentModel.aggregate([
      {
        $match: {
          enterprise_id: enterprise,
          createdAt: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: month
            ? { $dayOfMonth: '$createdAt' }
            : { $month: '$createdAt' },
          total: { $sum: 1 },
        },
      },
      {
        $project: {
          periodo: '$_id',
          total: 1,
          _id: 0,
        },
      },
      { $sort: { periodo: 1 } },
    ]);
  }

  /* =====================================================
     TABLA RESUMEN POR PLACA (CORREGIDA)
  ===================================================== */
  async tablaPorPlaca(year: number, enterprise: string, month?: number) {
    const { start, end } = this.rangoFecha(year, month);
    const hoy = new Date();
    
    // ✅ Pasar CODIGOS_ALISTAMIENTO como variable
    const codigosAlistamiento = this.CODIGOS_ALISTAMIENTO;

    return this.enlistmentModel.aggregate([
      {
        $match: {
          enterprise_id: enterprise,
          createdAt: { $gte: start, $lt: end },
        },
      },
      {
        $addFields: {
          actividadesInt: {
            $map: {
              input: '$actividades',
              as: 'a',
              in: { $toInt: '$$a' },
            },
          },
        },
      },
      {
        $group: {
          _id: '$placa',
          totalAlistamientos: { $sum: 1 },
          alistamientosConFalla: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    {
                      $size: {
                        $setDifference: [
                          codigosAlistamiento,  // ✅ Usar variable, no this
                          '$actividadesInt',
                        ],
                      },
                    },
                    0,
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'preventive_details',
          let: { placa: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$placa', '$$placa'] },
                    { $eq: ['$enterprise_id', enterprise] },
                    //{ $eq: ['$estado', true] },
                    { $gte: ['$executedAt', start] },
                    { $lt: ['$executedAt', end] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                vencidos: {
                  $sum: {
                    $cond: [{ $lt: ['$dueDate', hoy] }, 1, 0],
                  },
                },
              },
            },
          ],
          as: 'preventivos',
        },
      },
      {
        $lookup: {
          from: 'corrective_details',
          let: { placa: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$placa', '$$placa'] },
                    { $eq: ['$enterprise_id', enterprise] },
                    //{ $eq: ['$estado', true] },
                    { $gte: ['$occurredAt', start] },  // ✅ Campo correcto
                    { $lt: ['$occurredAt', end] },     // ✅ Campo correcto
                  ],
                },
              },
            },
            { $count: 'total' },
          ],
          as: 'correctivos',
        },
      },
      {
        $project: {
          placa: '$_id',
          totalAlistamientos: 1,
          alistamientosConFalla: 1,
          preventivosTotal: {
            $ifNull: [{ $arrayElemAt: ['$preventivos.total', 0] }, 0],
          },
          preventivosVencidos: {
            $ifNull: [{ $arrayElemAt: ['$preventivos.vencidos', 0] }, 0],
          },
          correctivosTotal: {
            $ifNull: [{ $arrayElemAt: ['$correctivos.total', 0] }, 0],
          },
          _id: 0,
        },
      },
      { $sort: { alistamientosConFalla: -1 } },
    ]);
  }

  /* =====================================================
     DASHBOARD GLOBAL
  ===================================================== */
  async getDashboard(year: number, enterprise: string, month?: number) {
    const [kpis, pie, trend, tabla] = await Promise.all([
      this.kpisSuperiores(year, enterprise, month),
      this.piePreventivos(enterprise, year, month),
      this.trendEnlistamientos(year, enterprise, month),
      this.tablaPorPlaca(year, enterprise, month),
    ]);

    return {
      kpis,
      piePreventivos: pie,
      trendEnlistamientos: trend,
      tablaVehiculos: tabla,
    };
  }
}