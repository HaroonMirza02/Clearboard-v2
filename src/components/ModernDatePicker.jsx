import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/ModernDatePicker.css';

const ModernDatePicker = ({ selected, onChange, placeholderText, disabled, ...props }) => {
    return (
        <DatePicker
            selected={selected}
            onChange={onChange}
            placeholderText={placeholderText || 'Select date'}
            disabled={disabled}
            dateFormat="yyyy-MM-dd"
            showPopperArrow={false}
            className="modern-date-input"
            calendarClassName="modern-calendar"
            {...props}
        />
    );
};

export default ModernDatePicker;
