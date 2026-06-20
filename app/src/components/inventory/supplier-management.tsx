'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Phone, Mail, MapPin, CreditCard, Plus, Edit, Eye, Search, Users } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  payment_terms?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface SupplierFormData {
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  gstin: string;
  payment_terms: string;
}

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
    payment_terms: ''
  });
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const restaurantId = 1;

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    filterSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppliers, searchTerm]);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const response = await invoke('get_suppliers', { restaurantId }) as {
        success: boolean;
        data?: Supplier[];
      };

      if (response.success && response.data) {
        setSuppliers(response.data);
      }
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSuppliers = () => {
    if (!searchTerm) {
      setFilteredSuppliers(suppliers);
      return;
    }

    const filtered = suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.contact_person && supplier.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (supplier.phone && supplier.phone.includes(searchTerm))
    );
    setFilteredSuppliers(filtered);
  };

  const handleInputChange = (field: keyof SupplierFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.phone && !/^[0-9+\-\s()]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    if (formData.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstin.toUpperCase())) {
      newErrors.gstin = 'Invalid GSTIN format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const request = {
        restaurant_id: restaurantId,
        name: formData.name.trim(),
        contact_person: formData.contact_person.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        gstin: formData.gstin.trim().toUpperCase() || undefined,
        payment_terms: formData.payment_terms.trim() || undefined,
      };

      const response = await invoke('create_supplier', { request }) as {
        success: boolean;
        error?: string;
      };

      if (response.success) {
        await loadSuppliers();
        resetForm();
        setShowForm(false);
      } else {
        console.error('Failed to create supplier:', response.error);
      }
    } catch (error) {
      console.error('Failed to create supplier:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      gstin: '',
      payment_terms: ''
    });
    setErrors({});
    setIsEditing(false);
    setSelectedSupplier(null);
  };

  const handleEdit = (supplier: Supplier) => {
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      gstin: supplier.gstin || '',
      payment_terms: supplier.payment_terms || ''
    });
    setSelectedSupplier(supplier);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleViewDetails = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetails(true);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Supplier Management</h1>
        <Button onClick={() => {resetForm(); setShowForm(true);}}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Supplier
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suppliers Directory</CardTitle>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search suppliers by name, contact, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Badge variant="secondary">
              {filteredSuppliers.length} suppliers
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading suppliers...</span>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier Details</TableHead>
                    <TableHead>Contact Information</TableHead>
                    <TableHead>Business Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-gray-500" />
                              {supplier.name}
                            </div>
                            {supplier.contact_person && (
                              <div className="text-sm text-gray-600 flex items-center gap-2">
                                <Users className="h-3 w-3" />
                                {supplier.contact_person}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {supplier.phone && (
                              <div className="text-sm flex items-center gap-2">
                                <Phone className="h-3 w-3 text-gray-500" />
                                {supplier.phone}
                              </div>
                            )}
                            {supplier.email && (
                              <div className="text-sm flex items-center gap-2">
                                <Mail className="h-3 w-3 text-gray-500" />
                                {supplier.email}
                              </div>
                            )}
                            {supplier.address && (
                              <div className="text-sm flex items-center gap-2">
                                <MapPin className="h-3 w-3 text-gray-500" />
                                <span className="max-w-32 truncate">{supplier.address}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {supplier.gstin && (
                              <div className="text-sm">
                                <span className="text-gray-600">GSTIN:</span> {supplier.gstin}
                              </div>
                            )}
                            {supplier.payment_terms && (
                              <div className="text-sm flex items-center gap-2">
                                <CreditCard className="h-3 w-3 text-gray-500" />
                                <span className="max-w-24 truncate">{supplier.payment_terms}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={supplier.is_active ? 
                            'bg-green-100 text-green-800 border-green-200' : 
                            'bg-gray-100 text-gray-800 border-gray-200'
                          }>
                            {supplier.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(supplier)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(supplier)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                        {searchTerm ? 'No suppliers found matching your search' : 'No suppliers added yet'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Supplier Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={errors.name ? 'border-red-500' : ''}
                  placeholder="Enter supplier name"
                />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => handleInputChange('contact_person', e.target.value)}
                  placeholder="Enter contact person name"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={errors.phone ? 'border-red-500' : ''}
                  placeholder="Enter phone number"
                />
                {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={errors.email ? 'border-red-500' : ''}
                  placeholder="Enter email address"
                />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  value={formData.gstin}
                  onChange={(e) => handleInputChange('gstin', e.target.value.toUpperCase())}
                  className={errors.gstin ? 'border-red-500' : ''}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
                {errors.gstin && <p className="text-sm text-red-500 mt-1">{errors.gstin}</p>}
              </div>

              <div>
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Input
                  id="payment_terms"
                  value={formData.payment_terms}
                  onChange={(e) => handleInputChange('payment_terms', e.target.value)}
                  placeholder="e.g., Net 30 days, Cash on delivery"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter complete address"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : isEditing ? 'Update Supplier' : 'Add Supplier'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Supplier Details</DialogTitle>
          </DialogHeader>
          {selectedSupplier && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Basic Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{selectedSupplier.name}</span>
                    </div>
                    {selectedSupplier.contact_person && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span>{selectedSupplier.contact_person}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge className={selectedSupplier.is_active ? 
                        'bg-green-100 text-green-800 border-green-200' : 
                        'bg-gray-100 text-gray-800 border-gray-200'
                      }>
                        {selectedSupplier.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Contact Information</h3>
                  <div className="space-y-2">
                    {selectedSupplier.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span>{selectedSupplier.phone}</span>
                      </div>
                    )}
                    {selectedSupplier.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span>{selectedSupplier.email}</span>
                      </div>
                    )}
                    {selectedSupplier.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <span className="text-sm">{selectedSupplier.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Business Details</h3>
                  <div className="space-y-2">
                    {selectedSupplier.gstin && (
                      <div>
                        <span className="text-sm text-gray-600">GSTIN:</span>
                        <div className="font-mono">{selectedSupplier.gstin}</div>
                      </div>
                    )}
                    {selectedSupplier.payment_terms && (
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-gray-500" />
                        <span>{selectedSupplier.payment_terms}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Record Information</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>Created: {formatDate(selectedSupplier.created_at)}</div>
                    <div>Updated: {formatDate(selectedSupplier.updated_at)}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Close
                </Button>
                <Button onClick={() => {setShowDetails(false); handleEdit(selectedSupplier);}}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Supplier
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}