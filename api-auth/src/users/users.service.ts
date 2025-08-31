import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(userInfo: any) {
    const hashedPassword = await bcrypt.hash(userInfo.password, 10);

    const newUser = new this.userModel({
      ...userInfo,
      password: hashedPassword,
      token: null,
    });

    return newUser.save();
  }

  async findByUsername(usuario: string) {
    return this.userModel.findOne({ "usuario.usuario": usuario }).exec();
  }

  async validateUser(usuario: string, password: string) {
    const user = await this.findByUsername(usuario);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    const { password: _, ...result } = user.toObject();
    return result;
  }
}
