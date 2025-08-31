import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Enterprise, EnterpriseDocument } from '../schemas/enterprise.schema';

@Injectable()
export class EnterpriseService {
  constructor(@InjectModel(Enterprise.name) private enterpriseModel: Model<EnterpriseDocument>) {}

  async create(data: { name: string; description: string }) {
    const newEnterprise = new this.enterpriseModel(data);
    return newEnterprise.save();
  }

  async findAll() {
    return this.enterpriseModel.find().exec();
  }

  async findById(id: string) {
    return this.enterpriseModel.findById(id).exec();
  }
}