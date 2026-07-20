export interface ColumnDataInfo {
    column_name: string;
    type: string;
    primary_key: boolean;
    unique: boolean;
    nullable: boolean;

    column_friendly_name?: string;
    label?: string;
    hint?: string;
    place_holder?: string;
    regex?: string;
    html_input_type?: string;
    required?: boolean;
    max_length?: number;
    default_value?: string;
    rows?: number;
    hidden?: boolean;
    readonly?: boolean;
    enum_values?: string[];
}
