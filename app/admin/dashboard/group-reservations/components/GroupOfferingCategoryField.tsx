"use client";

import { useState } from "react";

import { createServiceCategory, type ServiceCategory } from "@/app/admin/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";

type GroupOfferingCategoryFieldProps = {
    categories: ServiceCategory[];
    value: string;
    onValueChange: (value: string) => void;
    onCategoryCreated: (category: ServiceCategory) => void;
};

export function GroupOfferingCategoryField({ categories, value, onValueChange, onCategoryCreated }: GroupOfferingCategoryFieldProps) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
        const normalizedName = name.trim();
        if (!normalizedName) return;

        setCreating(true);
        try {
            const category = await createServiceCategory(normalizedName);
            onCategoryCreated(category);
            onValueChange(String(category.id));
            setName("");
            setOpen(false);
        } catch (error) {
            notify.error(error instanceof Error ? error.message : t("adminServices.createCategoryFailed"));
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <Label>{t("adminServices.category")} *</Label>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="sm">{t("adminServices.addCategory")}</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t("adminServices.addCategory")}</DialogTitle>
                            <DialogDescription>{t("adminServices.createCategoryDescription")}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                            <Label htmlFor="group-category-name">{t("adminServices.categoryNameRequiredLabel")}</Label>
                            <Input
                                id="group-category-name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder={t("adminServices.categoryNamePlaceholder")}
                                maxLength={100}
                                autoFocus
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
                            <Button type="button" onClick={() => void handleCreate()} disabled={creating || !name.trim()}>
                                {creating ? t("adminServices.creating") : t("adminServices.addCategory")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <Select value={value} onValueChange={onValueChange}>
                <SelectTrigger>
                    <SelectValue placeholder={t("adminServices.selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                    {categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
