import { User, type IAddress } from '../../models';
import { ApiError } from '../../lib/ApiError';

export type AddressInput = Omit<IAddress, '_id' | 'isDefault'> & { isDefault?: boolean };

export async function listAddresses(userId: string) {
  const user = await User.findById(userId).select('addresses');
  if (!user) throw ApiError.notFound('User not found');
  return user.addresses;
}

export async function createAddress(userId: string, input: AddressInput) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  if (input.isDefault) {
    user.addresses.forEach((a) => {
      a.isDefault = false;
    });
  }
  // First address is the default automatically, even if not requested.
  const isDefault = input.isDefault || user.addresses.length === 0;
  user.addresses.push({ ...input, isDefault } as IAddress);
  await user.save();
  return user.addresses[user.addresses.length - 1];
}

export async function updateAddress(userId: string, addressId: string, patch: Partial<AddressInput>) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const addr = user.addresses.id(addressId);
  if (!addr) throw ApiError.notFound('Address not found');

  if (patch.isDefault) {
    user.addresses.forEach((a) => {
      a.isDefault = false;
    });
  }
  Object.assign(addr, patch);
  await user.save();
  return addr;
}

export async function deleteAddress(userId: string, addressId: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const addr = user.addresses.id(addressId);
  if (!addr) throw ApiError.notFound('Address not found');
  const wasDefault = addr.isDefault;

  user.addresses.pull(addressId);
  if (wasDefault && user.addresses.length > 0) user.addresses[0].isDefault = true;
  await user.save();
  return user.addresses;
}

export async function setDefaultAddress(userId: string, addressId: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const addr = user.addresses.id(addressId);
  if (!addr) throw ApiError.notFound('Address not found');

  user.addresses.forEach((a) => {
    a.isDefault = a._id.toString() === addressId;
  });
  await user.save();
  return user.addresses;
}
