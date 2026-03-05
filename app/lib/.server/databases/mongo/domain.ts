import type { Document, ObjectId } from 'mongodb';

export interface IBaseMongoEntity extends Document {
    _id?: ObjectId;
    createdAt?: string;
    createdBy?: string;
    updatedAt?: string;
    updatedBy?: string;
    deletedAt?: Date;
    deletedBy?: string;
}

export class BaseFilter {
    private limit: number;
    private page: number;
    private offset: number;
    private search: string;
    private orderBy: string;
    private sort: string;

    public constructor(
        limit: number,
        page: number,
        offset: number,
        search: string,
        orderBy: string,
        sort: string
    ) {
        this.limit = limit;
        this.page = page;
        this.offset = offset;
        this.search = search;
        this.orderBy = orderBy;
        this.sort = sort;
    }

    public get getLimit(): number {
        return this.limit;
    }

    public set setLimit(limit: number) {
        this.limit = limit;
    }

    public get getPage(): number {
        return this.page;
    }

    public set setPage(page: number) {
        this.page = page;
    }

    public get getOffset(): number {
        return this.offset;
    }

    public set setOffset(offset: number) {
        this.offset = offset;
    }

    public get getSearch(): string {
        return this.search;
    }

    public set setSearch(search: string) {
        this.search = search;
    }

    public get getOrderBy(): string {
        return this.orderBy;
    }

    public set setOrderBy(orderBy: string) {
        this.orderBy = orderBy;
    }

    public get getSort(): string {
        return this.sort;
    }

    public set setSort(sort: string) {
        this.sort = sort;
    }

    public calculateOffset() {
        this.offset = (this.page! - 1) * this.limit!;
    }
}
